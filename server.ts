import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
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
const SAO_PAULO_TZ = 'America/Sao_Paulo';

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

let aiClient: GoogleGenAI | null = null;
let newsCache: NewsCacheEntry | null = null;
let inFlightNewsFetch: Promise<NewsCacheEntry> | null = null;

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
  // Rejeita datas futuras (> 10 min de folga) ou mais antigas que 30 dias
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

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
      if ((err as Error & { statusCode?: number })?.statusCode === 500) {
        throw err;
      }
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 600));
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

  if (inFlightNewsFetch) {
    return inFlightNewsFetch;
  }

  inFlightNewsFetch = fetchSmartWebNewsFromGemini()
    .then((entry) => {
      newsCache = entry;
      return entry;
    })
    .finally(() => {
      inFlightNewsFetch = null;
    });

  return inFlightNewsFetch;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/news', async (_req: Request, res: Response) => {
    try {
      const entry = await getLatestNews(false);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        source: 'gemini-web-search',
        updatedAtIso: entry.updatedAtIso,
        items: entry.items,
      });
    } catch (err) {
      const rawMessage =
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar notícias via busca inteligente.';
      const status =
        typeof (err as { status?: unknown })?.status === 'number'
          ? (err as { status: number }).status
          : typeof (err as { statusCode?: unknown })?.statusCode === 'number'
            ? (err as { statusCode: number }).statusCode
            : 502;

      let friendlyMessage = rawMessage;
      if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
        friendlyMessage =
          'Limite temporário de consultas da busca inteligente atingido (429). Verifique a cota/chave em Settings > Secrets; exibindo as notícias salvas.';
      } else if (
        status === 403 ||
        rawMessage.includes('PERMISSION_DENIED') ||
        rawMessage.includes('API_KEY_INVALID')
      ) {
        friendlyMessage =
          'Chave da busca inteligente inválida ou sem permissão. Verifique em Settings > Secrets.';
      } else if (rawMessage.trim().startsWith('{')) {
        friendlyMessage =
          'Não foi possível concluir a busca inteligente na web agora. Exibindo as notícias salvas.';
      }

      res.status(status >= 400 && status < 600 ? status : 502).json({
        ok: false,
        error: friendlyMessage,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Balcão Inteligente server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
