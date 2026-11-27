import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

type NewsCategory =
  | 'aco'
  | 'cimento'
  | 'pvc'
  | 'tintas'
  | 'eletrica'
  | 'agregados'
  | 'ceramica';

type NewsSignal = 'ALTA' | 'QUEDA' | 'ATENCAO' | 'ESTAVEL';

interface NormalizedNewsItem {
  id: string;
  materialId: string;
  materialNome: string;
  ncm: string;
  categoria: NewsCategory;
  fonte: string;
  articleUrl: string;
  publishedAt: string;
  ordemRecencia: number;
  sinal: NewsSignal;
  sinalLabel: string;
  titulo: string;
  gatilhos: string;
  impactoBalcao: string;
  destaqueCor: 'amarelo' | 'azul';
}

interface NewsCacheEntry {
  updatedAtIso: string;
  fetchedAtMs: number;
  items: NormalizedNewsItem[];
}

const PORT = Number(process.env.PORT) || 3000;
const NEWS_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 horas
const NEWS_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutos entre retentativas após erro/cota
const FORECAST_CACHE_TTL_MS = 60 * 1000; // 1 minuto (com revalidação ETag no GitHub)
const SAO_PAULO_TZ = 'America/Sao_Paulo';
const DEFAULT_GITHUB_FORECAST_URL =
  'https://github.com/giulianocardozo-dev/balcao_inteligente/blob/main/balcao%20inteligente%20181126%20projecao.xlsx';
const LOCAL_FORECAST_XLSX_PATH = path.resolve(
  process.cwd(),
  'balcao inteligente 181126 projecao.xlsx'
);

const TRACKED_MATERIALS: Array<{
  materialId: string;
  materialNome: string;
  ncm: string;
  categoria: NewsCategory;
  keywords: string;
}> = [
  {
    materialId: '00000033',
    materialNome: 'Vergalhão CA-50 10 mm',
    ncm: '7214.20.00',
    categoria: 'aco',
    keywords: 'aço longo, vergalhão, minério de ferro, siderurgia, tarifas de importação de aço',
  },
  {
    materialId: '00001379',
    materialNome: 'Cimento CP II 50 kg',
    ncm: '2523.29.10',
    categoria: 'cimento',
    keywords: 'cimento, clínquer, energia elétrica industrial, frete rodoviário, SNIC',
  },
  {
    materialId: '00001381',
    materialNome: 'Argamassa AC-II 20 kg',
    ncm: '3824.50.00',
    categoria: 'cimento',
    keywords: 'argamassa, cimento, aditivos, acabamento, vendas de materiais de construção, Abramat',
  },
  {
    materialId: '00000370',
    materialNome: 'Areia Média',
    ncm: '2505.10.00',
    categoria: 'agregados',
    keywords: 'areia, agregados, óleo diesel, frete de caminhão, transporte rodoviário',
  },
  {
    materialId: '00004721',
    materialNome: 'Brita 1',
    ncm: '2517.10.00',
    categoria: 'agregados',
    keywords: 'brita, pedreira, energia elétrica, diesel, frete pesado',
  },
  {
    materialId: '00000731',
    materialNome: 'Bloco Cerâmico 9x19x39',
    ncm: '6904.10.00',
    categoria: 'ceramica',
    keywords: 'cerâmica vermelha, olaria, bloco cerâmico, gás natural, energia térmica',
  },
  {
    materialId: '00007356',
    materialNome: 'Tinta Acrílica 18 L',
    ncm: '3209.10.10',
    categoria: 'tintas',
    keywords: 'tintas imobiliárias, resina acrílica, dióxido de titânio, dólar, Abrafati',
  },
  {
    materialId: '00009869',
    materialNome: 'Tubo PVC Esgoto 100 mm',
    ncm: '3917.23.00',
    categoria: 'pvc',
    keywords: 'resina PVC, petroquímica, petróleo, nafta, eteno, tubos e conexões',
  },
  {
    materialId: '00000984',
    materialNome: 'Cabo Flexível 2,5 mm²',
    ncm: '8544.49.00',
    categoria: 'eletrica',
    keywords: 'cobre, alumínio, cabos elétricos, fios condutores, câmbio dólar',
  },
];

interface ForecastCacheEntry {
  buffer: Buffer;
  source: 'github' | 'local';
  updatedAtIso: string;
  fetchedAtMs: number;
  localMtimeMs?: number;
  etag?: string;
}

let aiClient: GoogleGenAI | null = null;
let newsCache: NewsCacheEntry | null = null;
let newsCooldownUntilMs = 0;
let inFlightNewsFetch: Promise<NewsCacheEntry> | null = null;
let forecastCache: ForecastCacheEntry | null = null;
let inFlightForecastFetch: Promise<ForecastCacheEntry> | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'Chave GEMINI_API_KEY não configurada no servidor (Settings > Secrets).'
    );
    (err as Error & { statusCode?: number }).statusCode = 500;
    throw err;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

function getSaoPauloIsoDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getSaoPauloFormattedDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function isExcludedContent(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    (lower.includes('vergalhão') || lower.includes('vergalhao')) &&
    lower.includes('8 mm')
  ) || lower.includes('arame recozido') || lower.includes('7217.10.90');
}

function isValidArticleUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    const hasPath = parsed.pathname.replace(/\/+$/, '').length > 0;
    return hasPath || parsed.search.length > 0;
  } catch {
    return false;
  }
}

function extractJsonText(rawText: string): string {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1);
  }
  return trimmed;
}

function normalizePublishedAt(raw: unknown, now: Date): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let candidateIso = trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const todaySp = getSaoPauloIsoDate(now);
    if (trimmed === todaySp) {
      candidateIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    } else {
      candidateIso = `${trimmed}T12:00:00-03:00`;
    }
  }

  const ms = Date.parse(candidateIso);
  if (Number.isNaN(ms)) return null;

  const nowMs = now.getTime();
  if (ms > nowMs + 10 * 60 * 1000) {
    return null;
  }
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (nowMs - ms > thirtyDaysMs) {
    return null;
  }

  return new Date(Math.min(ms, nowMs)).toISOString();
}

function resolveMaterialTarget(
  rawMaterialId: unknown,
  rawCategory: unknown,
  contextText: string
) {
  const byId = TRACKED_MATERIALS.find((m) => m.materialId === String(rawMaterialId ?? '').trim());
  if (byId) return byId;

  const catLower = String(rawCategory ?? '').toLowerCase().trim();
  const byCat = TRACKED_MATERIALS.find((m) => m.categoria === catLower);
  if (byCat) return byCat;

  const textLower = contextText.toLowerCase();
  if (textLower.includes('aço') || textLower.includes('aco') || textLower.includes('vergalh')) {
    return TRACKED_MATERIALS[0];
  }
  if (textLower.includes('argamassa')) return TRACKED_MATERIALS[2];
  if (textLower.includes('cimento') || textLower.includes('clínquer')) return TRACKED_MATERIALS[1];
  if (textLower.includes('areia')) return TRACKED_MATERIALS[3];
  if (textLower.includes('brita') || textLower.includes('pedreira')) return TRACKED_MATERIALS[4];
  if (textLower.includes('cerâm') || textLower.includes('ceram') || textLower.includes('bloco')) {
    return TRACKED_MATERIALS[5];
  }
  if (textLower.includes('tinta')) return TRACKED_MATERIALS[6];
  if (textLower.includes('pvc') || textLower.includes('petróleo') || textLower.includes('nafta')) {
    return TRACKED_MATERIALS[7];
  }
  if (textLower.includes('cabo') || textLower.includes('cobre') || textLower.includes('alumínio')) {
    return TRACKED_MATERIALS[8];
  }
  return TRACKED_MATERIALS[1];
}

function matchGroundingUrl(
  rawUrl: unknown,
  title: string,
  chunks: Array<{ uri: string; title: string }>
): string | null {
  if (isValidArticleUrl(rawUrl)) {
    return rawUrl.trim();
  }

  const words = title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 4);

  let bestUri: string | null = null;
  let bestScore = 0;

  for (const chunk of chunks) {
    if (!isValidArticleUrl(chunk.uri)) continue;
    const chunkLower = chunk.title.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (chunkLower.includes(w)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestUri = chunk.uri.trim();
    }
  }

  return bestScore >= 2 ? bestUri : null;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

const RSS_CATEGORY_QUERIES: Array<{
  categoria: NewsCategory;
  query: string;
  requiredTerms: string[];
}> = [
  {
    categoria: 'aco',
    query: '(vergalhão OR "aço longo" OR siderurgia OR Usiminas OR Gerdau) (preço OR alta OR queda OR importação OR aço) when:30d',
    requiredTerms: ['aco', 'aço', 'vergalh', 'siderurg', 'usiminas', 'gerdau', 'minerio', 'minério'],
  },
  {
    categoria: 'cimento',
    query: '(cimento OR argamassa OR clínquer OR SNIC) (preço OR venda OR custo OR produção) when:30d',
    requiredTerms: ['cimento', 'argamassa', 'clinquer', 'clínquer', 'snic'],
  },
  {
    categoria: 'agregados',
    query: '("frete rodoviário" OR "óleo diesel" OR areia OR brita OR agregados) (preço OR alta OR queda OR transporte) when:30d',
    requiredTerms: ['frete', 'diesel', 'areia', 'brita', 'agregad', 'transporte rodovi'],
  },
  {
    categoria: 'ceramica',
    query: '("materiais de construção" OR Abramat OR "bloco cerâmico" OR "cerâmica vermelha") (venda OR preço OR custo OR construção) when:30d',
    requiredTerms: ['abramat', 'materiais de constru', 'material de constru', 'ceram', 'cerâm', 'bloco'],
  },
  {
    categoria: 'tintas',
    query: '("tintas imobiliárias" OR Abrafati OR "tinta acrílica" OR "dióxido de titânio") when:30d',
    requiredTerms: ['tinta', 'tintas', 'abrafati', 'acrilica', 'acrílica', 'titanio', 'titânio'],
  },
  {
    categoria: 'pvc',
    query: '("resina PVC" OR "tubos e conexões" OR petroquímica OR Braskem OR petróleo) (preço OR alta OR queda OR venda) when:30d',
    requiredTerms: ['pvc', 'petroquim', 'petroquím', 'braskem', 'petroleo', 'petróleo', 'tubos'],
  },
  {
    categoria: 'eletrica',
    query: '("preço do cobre" OR "cotação do cobre" OR "cabos elétricos" OR "fios elétricos" OR "preço do alumínio") (alta OR queda OR mercado OR indústria) when:30d',
    requiredTerms: ['cabos', 'cabo ', 'fios ', 'aluminio', 'alumínio', 'do cobre', 'de cobre', 'condutor', 'commodities'],
  },
];

const NOISE_PHRASES = [
  'jato de tinta', 'impressora', 'tatuagem', 'caneta', 'latinhas', 'refrigerante', 'cerveja', 'futebol', 'novela', 'bbb', 'homicidio', 'homicídio', 'caixa de gordura', 'ministerio da saude do peru', 'ministério da saúde do peru', 'contrata', 'vaga de', 'vagas de', 'vagas em', 'empregos', 'processo seletivo', 'operador(a)', 'estagio', 'estágio', 'não cobre', 'nao cobre', 'banana', 'quadrilha', 'furto', 'roubo', 'corrida do aço', 'alimentos', 'charretes', 'tapete de areia', 'estiagem', 'sargaço', 'cadivi',
];

const MARKET_RELEVANCE_TERMS = [
  'preço', 'preco', 'custo', 'venda', 'alta', 'queda', 'recua', 'sobe', 'cai', 'mercado', 'indústria', 'industria', 'produção', 'producao', 'importa', 'tarifa', 'abramat', 'anamaco', 'abrafati', 'snic', 'frete', 'diesel', 'construção', 'construcao', 'petróleo', 'petroleo', 'cotação', 'cotacao', 'lucro', 'operação', 'operacao', 'demanda', 'oferta', 'bilhões', 'bilhoes', 'milhões', 'milhoes',
];

function isRelevantNewsTitle(title: string, requiredTerms: string[]): boolean {
  const lower = title.toLowerCase();
  if (isExcludedContent(lower)) return false;
  if (NOISE_PHRASES.some((phrase) => lower.includes(phrase))) return false;
  return (
    requiredTerms.some((term) => lower.includes(term)) &&
    MARKET_RELEVANCE_TERMS.some((term) => lower.includes(term))
  );
}

function classifyRssSignal(title: string): {
  sinal: NewsSignal;
  sinalLabel: string;
  destaqueCor: 'amarelo' | 'azul';
} {
  const lower = title.toLowerCase();
  const hasUp = /\b(alta|sobe|subiu|subiram|dispara|disparam|aumento|aumenta|eleva|elevam|encarece|press[aã]o|avan[cç]a|reajuste|tarifa)\b/.test(lower);
  const hasDown = /\b(queda|cai|caiu|caem|recua|recuo|desaba|al[ií]vio|redu[cç][aã]o|barateia|baixa|derrete)\b/.test(lower);
  const hasWarn = /\b(alerta|risco|incerteza|revis[aã]o|importad|custo|d[ií]vida|desafio|escassez|greve|preocupa)\b/.test(lower);

  if (hasUp && !hasDown) {
    return { sinal: 'ALTA', sinalLabel: 'Pressão de Alta', destaqueCor: 'amarelo' };
  }
  if (hasDown && !hasUp) {
    return { sinal: 'QUEDA', sinalLabel: 'Alívio de Custo', destaqueCor: 'azul' };
  }
  if (hasWarn || (hasUp && hasDown)) {
    return { sinal: 'ATENCAO', sinalLabel: 'Atenção no Mercado', destaqueCor: 'amarelo' };
  }
  return { sinal: 'ESTAVEL', sinalLabel: 'Mercado Estável', destaqueCor: 'azul' };
}

function buildRssTriggers(title: string, materialNome: string, categoria: NewsCategory): string {
  const lower = title.toLowerCase();
  const tags: string[] = [];
  if (lower.includes('diesel') || lower.includes('frete')) tags.push('Frete e diesel');
  if (lower.includes('petróleo') || lower.includes('petroleo')) tags.push('Petróleo e resina');
  if (lower.includes('import')) tags.push('Produto importado');
  if (lower.includes('cobre') || lower.includes('alumínio') || lower.includes('aluminio')) tags.push('Metais condutores');
  if (lower.includes('minério') || lower.includes('minerio') || lower.includes('aço')) tags.push('Cadeia do aço');
  if (lower.includes('energia') || lower.includes('luz')) tags.push('Custo de energia');
  if (lower.includes('abramat') || lower.includes('construção')) tags.push('Demanda da construção');

  if (tags.length >= 2) return tags.slice(0, 3).join(' · ');

  const fallbackByCat: Record<NewsCategory, string> = {
    aco: `${materialNome} · Siderurgia e custo do aço`,
    cimento: `${materialNome} · Produção e demanda de cimento`,
    agregados: `${materialNome} · Frete rodoviário e diesel`,
    ceramica: `${materialNome} · Demanda do varejo da construção`,
    tintas: `${materialNome} · Insumos e linha imobiliária`,
    pvc: `${materialNome} · Cadeia petroquímica e resina PVC`,
    eletrica: `${materialNome} · Cotação de metais condutores`,
  };
  return tags.length === 1 ? `${tags[0]} · ${materialNome}` : fallbackByCat[categoria];
}

function resolveMaterialForRss(categoria: NewsCategory, title: string) {
  const lower = title.toLowerCase();
  if (categoria === 'cimento' && lower.includes('argamassa')) {
    return TRACKED_MATERIALS.find((m) => m.materialId === '00001381')!;
  }
  if (categoria === 'agregados' && lower.includes('brita')) {
    return TRACKED_MATERIALS.find((m) => m.materialId === '00004721')!;
  }
  return (
    TRACKED_MATERIALS.find((m) => m.categoria === categoria) ??
    resolveMaterialTarget('', categoria, title)
  );
}

async function fetchWebNewsFromRss(): Promise<NewsCacheEntry> {
  const now = new Date();
  const nowMs = now.getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const perCategoryItems = await Promise.all(
    RSS_CATEGORY_QUERIES.map(async ({ categoria, query, requiredTerms }) => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
        query
      )}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BalcaoInteligente/1.0)',
          },
          signal: controller.signal,
        });
        if (!res.ok) return [] as NormalizedNewsItem[];
        const xml = await res.text();
        const rawItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
        const parsedForCategory: NormalizedNewsItem[] = [];

        for (const match of rawItems) {
          const block = match[1];
          const rawTitle = decodeXmlEntities(
            block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''
          );
          const rawLink = decodeXmlEntities(
            block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ''
          );
          const rawPubDate = decodeXmlEntities(
            block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? ''
          );
          const rawSource = decodeXmlEntities(
            block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? ''
          );

          if (!rawTitle || !isValidArticleUrl(rawLink)) continue;

          const fonte = rawSource || 'Google Notícias';
          const suffix = ` - ${fonte}`;
          const titulo = rawTitle.endsWith(suffix)
            ? rawTitle.slice(0, -suffix.length).trim()
            : rawTitle;

          if (!titulo || !isRelevantNewsTitle(titulo, requiredTerms)) continue;

          const pubMs = Date.parse(rawPubDate);
          if (Number.isNaN(pubMs)) continue;
          if (pubMs > nowMs + 10 * 60 * 1000 || nowMs - pubMs > thirtyDaysMs) continue;

          const publishedAt = new Date(Math.min(pubMs, nowMs)).toISOString();
          const target = resolveMaterialForRss(categoria, titulo);
          const { sinal, sinalLabel, destaqueCor } = classifyRssSignal(titulo);
          const gatilhos = buildRssTriggers(titulo, target.materialNome, categoria);

          parsedForCategory.push({
            id: `rss-news-${target.materialId}-${pubMs}-${parsedForCategory.length}`,
            materialId: target.materialId,
            materialNome: target.materialNome,
            ncm: target.ncm,
            categoria: target.categoria,
            fonte,
            articleUrl: rawLink,
            publishedAt,
            ordemRecencia: 0,
            sinal,
            sinalLabel,
            titulo,
            gatilhos,
            impactoBalcao: gatilhos,
            destaqueCor,
          });
        }

        parsedForCategory.sort(
          (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
        );
        return parsedForCategory.slice(0, 3);
      } catch {
        return [] as NormalizedNewsItem[];
      } finally {
        clearTimeout(timeoutId);
      }
    })
  );

  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const merged: NormalizedNewsItem[] = [];

  for (const group of perCategoryItems) {
    for (const item of group) {
      const titleKey = item.titulo.toLowerCase();
      if (seenUrls.has(item.articleUrl) || seenTitles.has(titleKey)) continue;
      seenUrls.add(item.articleUrl);
      seenTitles.add(titleKey);
      merged.push(item);
    }
  }

  if (merged.length === 0) {
    throw new Error('Nenhuma notícia recente encontrada nas fontes RSS no momento.');
  }

  merged.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const finalItems = merged.slice(0, 15).map((item, idx) => ({
    ...item,
    ordemRecencia: idx + 1,
  }));

  return {
    updatedAtIso: now.toISOString(),
    fetchedAtMs: now.getTime(),
    items: finalItems,
  };
}

async function fetchSmartWebNewsFromGemini(): Promise<NewsCacheEntry> {
  const ai = getGeminiClient();
  const now = new Date();
  const todayBr = getSaoPauloFormattedDateTime(now);
  const todayIso = getSaoPauloIsoDate(now);

  const materialsPrompt = TRACKED_MATERIALS.map(
    (m) =>
      `- materialId="${m.materialId}", materialNome="${m.materialNome}", ncm="${m.ncm}", categoria="${m.categoria}" (temas: ${m.keywords})`
  ).join('\n');

  const prompt = `Você é um analista de compras do setor brasileiro de materiais de construção.
Data e hora atual oficial em Brasília (America/Sao_Paulo): ${todayBr} (data ISO de hoje: ${todayIso}, UTC: ${now.toISOString()}).

Faça uma busca na web por notícias REAIS e RECENTES (exclusivamente publicadas nos últimos 30 dias até ${todayIso}, dando máxima prioridade para notícias de HOJE ${todayIso} e dos últimos 7 dias) em portais brasileiros confiáveis (como InfoMoney, Valor Econômico, Exame, CNN Brasil, g1 Economia, Money Times, Agência Brasil, Estadão, Folha) sobre fatores que afetam custos, oferta, demanda ou frete destes 9 materiais de construção no Brasil:
${materialsPrompt}

REGRAS CRÍTICAS:
1. NUNCA inclua notícias sobre "Vergalhão CA-50 8 mm" ou "Arame recozido nº 18".
2. Cada item deve ter o link DIRETO e real da matéria encontrada na busca web ("articleUrl"), nunca apenas a página inicial do site.
3. Verifique rigorosamente a data de publicação ("publishedAt" em ISO 8601 com fuso horário, ex.: "${todayIso}T10:30:00-03:00"). Nunca invente datas futuras nem marque matéria de ontem como se fosse de hoje.
4. Gere entre 10 e 15 notícias variadas cobrindo o máximo possível das 7 categorias (aco, cimento, pvc, tintas, eletrica, agregados, ceramica), trazendo notícias das últimas 24h (se houver), última semana e último mês.
5. Escreva "gatilhos" e "impactoBalcao" em linguagem simples e prática de dono de depósito (linguagem de balcão).
6. Responda EXCLUSIVAMENTE com um JSON válido no formato:
{
  "items": [
    {
      "materialId": "00001379",
      "categoria": "cimento",
      "fonte": "InfoMoney",
      "articleUrl": "https://...",
      "publishedAt": "2026-11-18T09:15:00-03:00",
      "sinal": "ALTA" | "QUEDA" | "ATENCAO" | "ESTAVEL",
      "sinalLabel": "rótulo curto de 2 a 4 palavras",
      "titulo": "Título objetivo da matéria",
      "gatilhos": "Resumo curto dos fatores separados por ·",
      "impactoBalcao": "Explicação prática em 2 frases para o dono da loja."
    }
  ]
}`;

  const modelAttempts: Array<{ model: string; useThinking: boolean }> = [
    { model: 'gemini-4-hydrogen', useThinking: true },
    { model: 'gemini-3.1-flash-lite', useThinking: false },
  ];

  let lastError: unknown = null;
  for (const attemptCfg of modelAttempts) {
    try {
      const response = await ai.models.generateContent({
        model: attemptCfg.model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          ...(attemptCfg.useThinking
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
          systemInstruction:
            'Retorne apenas JSON válido sem texto fora do objeto JSON. Utilize apenas URLs reais de notícias obtidas pela busca web.',
        },
      });

      const rawText = response.text ?? '';
      const jsonText = extractJsonText(rawText);
      const parsed = JSON.parse(jsonText) as
        | { items?: Array<Record<string, unknown>> }
        | Array<Record<string, unknown>>;

      const rawList = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.items)
          ? parsed.items
          : [];

      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const groundingChunks = rawChunks
        .map((c) => ({
          uri: typeof c?.web?.uri === 'string' ? c.web.uri : '',
          title: typeof c?.web?.title === 'string' ? c.web.title : '',
        }))
        .filter((c) => c.uri.length > 0);

      const seenUrls = new Set<string>();
      const seenTitles = new Set<string>();
      const normalized: NormalizedNewsItem[] = [];

      for (let i = 0; i < rawList.length; i += 1) {
        const raw = rawList[i];
        const titulo = typeof raw.titulo === 'string' ? raw.titulo.trim() : '';
        const gatilhos = typeof raw.gatilhos === 'string' ? raw.gatilhos.trim() : '';
        const impactoBalcao =
          typeof raw.impactoBalcao === 'string' ? raw.impactoBalcao.trim() : '';
        const fonte = typeof raw.fonte === 'string' ? raw.fonte.trim() : '';

        if (!titulo || !impactoBalcao || !fonte) continue;
        if (isExcludedContent(`${titulo} ${gatilhos} ${impactoBalcao}`)) continue;

        const publishedAt = normalizePublishedAt(raw.publishedAt, now);
        if (!publishedAt) continue;

        const articleUrl = matchGroundingUrl(raw.articleUrl, titulo, groundingChunks);
        if (!articleUrl) continue;

        const normTitleKey = titulo.toLowerCase();
        if (seenUrls.has(articleUrl) || seenTitles.has(normTitleKey)) continue;
        seenUrls.add(articleUrl);
        seenTitles.add(normTitleKey);

        const target = resolveMaterialTarget(
          raw.materialId,
          raw.categoria,
          `${titulo} ${gatilhos}`
        );

        const rawSignal = String(raw.sinal ?? 'ESTAVEL').toUpperCase().trim();
        const sinal: NewsSignal =
          rawSignal === 'ALTA' ||
          rawSignal === 'QUEDA' ||
          rawSignal === 'ATENCAO' ||
          rawSignal === 'ESTAVEL'
            ? rawSignal
            : 'ESTAVEL';

        const sinalLabel =
          typeof raw.sinalLabel === 'string' && raw.sinalLabel.trim()
            ? raw.sinalLabel.trim()
            : sinal === 'ALTA'
              ? 'Pressão de Alta'
              : sinal === 'QUEDA'
                ? 'Alívio de Custo'
                : sinal === 'ATENCAO'
                  ? 'Atenção no Mercado'
                  : 'Mercado Estável';

        const destaqueCor: 'amarelo' | 'azul' =
          sinal === 'ALTA' || sinal === 'ATENCAO' ? 'amarelo' : 'azul';

        normalized.push({
          id: `web-news-${target.materialId}-${Date.parse(publishedAt)}-${i}`,
          materialId: target.materialId,
          materialNome: target.materialNome,
          ncm: target.ncm,
          categoria: target.categoria,
          fonte,
          articleUrl,
          publishedAt,
          ordemRecencia: i + 1,
          sinal,
          sinalLabel,
          titulo,
          gatilhos: gatilhos || `${target.materialNome} · Custo e oferta no mercado`,
          impactoBalcao,
          destaqueCor,
        });
      }

      if (normalized.length === 0) {
        throw new Error('Nenhuma notícia válida retornada pela busca web.');
      }

      normalized.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
      const finalItems = normalized.map((item, idx) => ({
        ...item,
        ordemRecencia: idx + 1,
      }));

      return {
        updatedAtIso: now.toISOString(),
        fetchedAtMs: now.getTime(),
        items: finalItems,
      };
    } catch (err) {
      lastError = err;
      const errStatus = (err as { status?: number; statusCode?: number })?.status ??
        (err as { statusCode?: number })?.statusCode;
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errStatus === 500 || errStatus === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
        throw err;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Falha ao consultar a busca inteligente de notícias.');
}

async function getLatestNews(forceRefresh: boolean): Promise<NewsCacheEntry> {
  const nowMs = Date.now();
  if (
    !forceRefresh &&
    newsCache &&
    nowMs - newsCache.fetchedAtMs < NEWS_CACHE_TTL_MS
  ) {
    return newsCache;
  }

  if (!forceRefresh && nowMs < newsCooldownUntilMs) {
    if (newsCache) return newsCache;
    throw new Error('Houve um problema na atualização. Exibindo as últimas notícias salvas');
  }

  if (inFlightNewsFetch) {
    return inFlightNewsFetch;
  }

  inFlightNewsFetch = fetchSmartWebNewsFromGemini()
    .then((entry) => {
      newsCache = entry;
      newsCooldownUntilMs = 0;
      return entry;
    })
    .catch((err) => {
      newsCooldownUntilMs = Date.now() + NEWS_COOLDOWN_MS;
      if (newsCache) return newsCache;
      throw err;
    })
    .finally(() => {
      inFlightNewsFetch = null;
    });

  return inFlightNewsFetch;
}

function resolveGitHubForecastTargets(): {
  apiUrl: string | null;
  rawUrl: string;
} {
  const configured =
    process.env.GITHUB_FORECAST_URL?.trim() || DEFAULT_GITHUB_FORECAST_URL;

  const blobMatch = configured.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/
  );
  if (blobMatch) {
    const [, owner, repo, branch, filePath] = blobMatch;
    const encodedPath = filePath
      .split('/')
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join('/');
    return {
      apiUrl: `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
      rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodedPath}`,
    };
  }

  const rawMatch = configured.match(
    /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/
  );
  if (rawMatch) {
    const [, owner, repo, branch, filePath] = rawMatch;
    const encodedPath = filePath
      .split('/')
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join('/');
    return {
      apiUrl: `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
      rawUrl: configured,
    };
  }

  return {
    apiUrl: null,
    rawUrl: configured,
  };
}

async function loadForecastWorkbook(force = false): Promise<ForecastCacheEntry> {
  const nowMs = Date.now();
  if (!force && forecastCache && nowMs - forecastCache.fetchedAtMs < FORECAST_CACHE_TTL_MS) {
    if (forecastCache.source !== 'local') {
      return forecastCache;
    }
    try {
      const stat = await fs.promises.stat(LOCAL_FORECAST_XLSX_PATH);
      if (stat.mtimeMs === forecastCache.localMtimeMs) {
        return forecastCache;
      }
    } catch {
      return forecastCache;
    }
  }

  if (inFlightForecastFetch) {
    return inFlightForecastFetch;
  }

  inFlightForecastFetch = (async () => {
    const githubToken = process.env.GITHUB_TOKEN?.trim();
    const { apiUrl, rawUrl } = resolveGitHubForecastTargets();
    const fetchUrl = apiUrl ?? rawUrl;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const headers: Record<string, string> = {
          'User-Agent': 'balcao-inteligente-server',
        };
        if (apiUrl) {
          headers.Accept = 'application/vnd.github.raw+json';
          headers['X-GitHub-Api-Version'] = '2022-11-28';
        }
        if (githubToken) {
          headers.Authorization = `Bearer ${githubToken}`;
        }
        if (forecastCache?.source === 'github' && forecastCache.etag) {
          headers['If-None-Match'] = forecastCache.etag;
        }

        const res = await fetch(fetchUrl, {
          method: 'GET',
          cache: 'no-store',
          headers,
          signal: controller.signal,
        });

        if (res.status === 304 && forecastCache?.source === 'github') {
          forecastCache = {
            ...forecastCache,
            fetchedAtMs: Date.now(),
          };
          return forecastCache;
        }

        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          if (buffer.byteLength > 0) {
            const etag = res.headers.get('etag') ?? undefined;
            const entry: ForecastCacheEntry = {
              buffer,
              source: 'github',
              updatedAtIso: new Date().toISOString(),
              fetchedAtMs: Date.now(),
              etag,
            };
            forecastCache = entry;
            return entry;
          }
        } else {
          console.warn(`[forecast] GitHub fetch returned HTTP ${res.status}; using local fallback.`);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      console.warn(`[forecast] GitHub fetch failed (${msg}); using local fallback.`);
    }

    const [buffer, stat] = await Promise.all([
      fs.promises.readFile(LOCAL_FORECAST_XLSX_PATH),
      fs.promises.stat(LOCAL_FORECAST_XLSX_PATH),
    ]);
    const entry: ForecastCacheEntry = {
      buffer,
      source: 'local',
      updatedAtIso: stat.mtime.toISOString(),
      fetchedAtMs: Date.now(),
      localMtimeMs: stat.mtimeMs,
    };
    forecastCache = entry;
    return entry;
  })().finally(() => {
    inFlightForecastFetch = null;
  });

  return inFlightForecastFetch;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/forecast', async (req: Request, res: Response) => {
    try {
      const force = req.query.force === '1';
      const entry = await loadForecastWorkbook(force);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('X-Forecast-Source', entry.source);
      res.setHeader('X-Forecast-Updated-At', entry.updatedAtIso);
      res.send(entry.buffer);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Planilha de projeções não encontrada no servidor.';
      res.status(500).json({ ok: false, error: msg });
    }
  });

  app.get('/api/news', async (req: Request, res: Response) => {
    try {
      const force = req.query.force === '1';
      const entry = await getLatestNews(force);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        source: 'smart-web-news',
        updatedAtIso: entry.updatedAtIso,
        items: entry.items,
      });
    } catch {
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({
        ok: false,
        error: 'Houve um problema na atualização. Exibindo as últimas notícias salvas',
      });
    }
  });

  app.get('/api/telas-pptx', async (_req: Request, res: Response) => {
    const candidates = [
      path.resolve(process.cwd(), 'public', 'Balcao_Inteligente_Telas.pptx'),
      path.resolve(process.cwd(), 'dist', 'Balcao_Inteligente_Telas.pptx'),
    ];
    const filePath = candidates.find((p) => fs.existsSync(p));
    if (!filePath) {
      res.status(404).json({ ok: false, error: 'Apresentação não encontrada.' });
      return;
    }
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Balcao_Inteligente_Telas.pptx"'
    );
    res.sendFile(filePath);
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    if (process.env.DISABLE_HMR === undefined) {
      process.env.DISABLE_HMR = 'true';
    }
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build not found.');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Balcão Inteligente server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
