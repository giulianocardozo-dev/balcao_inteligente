import { MarketNewsItem, NewsCategory, NewsTimeRange } from '../types/inventory';

export interface NewsFilterChip {
  id: NewsCategory;
  label: string;
}

export interface NewsTimeRangeOption {
  id: NewsTimeRange;
  label: string;
  shortLabel: string;
  maxHours: number;
}

export const NEWS_TIME_RANGES: NewsTimeRangeOption[] = [
  { id: '24h', label: 'Nas últimas 24 h', shortLabel: 'Últimas 24 h', maxHours: 24 },
  { id: 'semana', label: 'Na última semana', shortLabel: 'Última semana', maxHours: 24 * 7 },
  { id: 'mes', label: 'No último mês', shortLabel: 'Último mês', maxHours: 24 * 30 },
];

export const NEWS_FILTER_CHIPS: NewsFilterChip[] = [
  { id: 'todos', label: 'Todos os Materiais' },
  { id: 'aco', label: 'Aço' },
  { id: 'cimento', label: 'Cimento' },
  { id: 'pvc', label: 'PVC' },
  { id: 'tintas', label: 'Tintas' },
  { id: 'eletrica', label: 'Elétrica' },
  { id: 'agregados', label: 'Agregados' },
  { id: 'ceramica', label: 'Cerâmica' },
];

export const MATERIAL_NCM_MAP: Record<string, string> = {
  '00000033': '7214.20.00', // Vergalhão CA-50 10 mm
  '00001379': '2523.29.10', // Cimento CP II 50 kg
  '00000370': '2505.10.00', // Areia média
  '00004721': '2517.10.00', // Brita 1
  '00000731': '6904.10.00', // Bloco cerâmico 9x19x39
  '00001381': '3824.50.00', // Argamassa AC-II 20 kg
  '00007356': '3209.10.10', // Tinta acrílica 18 L
  '00009869': '3917.23.00', // Tubo PVC esgoto 100 mm
  '00000984': '8544.49.00', // Cabo flexível 2,5 mm²
};

export const MARKET_NEWS_ITEMS: MarketNewsItem[] = [
  // === ÚLTIMAS 24 HORAS (<= 24h) ===
  {
    id: 'news-agregados-diesel-subsidio-2026-11-26',
    materialId: '00000370',
    materialNome: 'Areia Média',
    ncm: '2505.10.00',
    categoria: 'agregados',
    fonte: 'Agência Brasil',
    articleUrl:
      'https://agenciabrasil.ebc.com.br/economia/noticia/2026-11/governo-prorroga-subsidio-de-r-212-ao-diesel-por-mais-30-dias',
    publishedAt: '2026-11-26T22:31:00Z',
    dataLabel: 'Ontem · 26/11',
    ordemRecencia: 1,
    sinal: 'ESTAVEL',
    sinalLabel: 'Frete Segurado no Curto Prazo',
    titulo:
      'Governo prorroga subsídio de R$ 2,12 ao diesel por mais 30 dias e segura disparada imediata no frete pesado',
    gatilhos: 'Subsídio de R$ 2,12/L no diesel · Frete da caçamba · Logística de agregados',
    impactoBalcao:
      'Na areia média, o frete do caminhão pesa forte no custo entregue na loja. A prorrogação por 30 dias evita repasse imediato no carreto, mas vale programar pedidos com carga fechada antes do próximo vencimento.',
    destaqueCor: 'azul',
  },
  {
    id: 'news-pvc-brent-alta-2026-11-26',
    materialId: '00009869',
    materialNome: 'Tubo PVC Esgoto 100 mm',
    ncm: '3917.23.00',
    categoria: 'pvc',
    fonte: 'InfoMoney',
    articleUrl:
      'https://www.infomoney.com.br/mercados/brent-fecha-em-alta-diante-de-temores-com-interrupcoes-no-abastecimento/',
    publishedAt: '2026-11-26T20:18:59Z',
    dataLabel: 'Ontem · 26/11',
    ordemRecencia: 2,
    sinal: 'ATENCAO',
    sinalLabel: 'Atenção na Resina PVC',
    titulo:
      'Petróleo Brent volta a subir com temores no abastecimento global e coloca resina PVC no radar',
    gatilhos: 'Petróleo Brent · Nafta e eteno (resina PVC) · Volatilidade externa',
    impactoBalcao:
      'Apesar do recuo recente nas tabelas locais de PVC, a nova alta do Brent reacende atenção sobre o custo futuro da matéria-prima petroquímica. Mantenha o giro normal e negocie prazo sem carregar estoque excessivo.',
    destaqueCor: 'amarelo',
  },
  {
    id: 'news-ceramica-incc-nov-2026-11-26',
    materialId: '00000731',
    materialNome: 'Bloco Cerâmico 9x19x39',
    ncm: '6904.10.00',
    categoria: 'ceramica',
    fonte: 'Sinduscon-SP',
    articleUrl: 'https://sindusconsp.com.br/incc-m-cresce-030-em-novembro/',
    publishedAt: '2026-11-26T12:44:21Z',
    dataLabel: 'Ontem · 26/11',
    ordemRecencia: 3,
    sinal: 'ESTAVEL',
    sinalLabel: 'Custo em Desaceleração',
    titulo:
      'INCC-M desacelera para 0,30% em novembro com alívio pontual em itens cerâmicos e serviços de obra',
    gatilhos: 'INCC-M de novembro (0,30%) · Revestimentos e cerâmica (-0,34%) · Demanda moderada',
    impactoBalcao:
      'A desaceleração da inflação da construção e o recuo pontual nos itens cerâmicos reduzem espaço para repasses imediatos das olarias. Reponha blocos conforme a saída do pátio para manter capital livre.',
    destaqueCor: 'azul',
  },

  // === ÚLTIMA SEMANA (<= 7 dias) ===
  {
    id: 'news-argamassa-incc-12m-2026-11-25',
    materialId: '00001381',
    materialNome: 'Argamassa AC-II 20 kg',
    ncm: '3824.50.00',
    categoria: 'cimento',
    fonte: 'InfoMoney',
    articleUrl:
      'https://www.infomoney.com.br/economia/inflacao-da-construcao-chega-a-677-em-12-meses-em-novembro-diz-fgv-ibre/',
    publishedAt: '2026-11-25T12:04:30Z',
    dataLabel: '25/11/2026',
    ordemRecencia: 4,
    sinal: 'ALTA',
    sinalLabel: 'Pressão em Materiais',
    titulo:
      'Inflação da construção chega a 6,77% em 12 meses em novembro puxada por materiais e equipamentos, diz FGV/Ibre',
    gatilhos: 'Materiais e Equipamentos (+0,39% no mês) · Argamassas e insumos básicos · INCC acumulado',
    impactoBalcao:
      'O grupo de materiais seguiu pressionando o índice da FGV acima da mão de obra em novembro. Como a argamassa AC-II já aponta leve alta para dezembro, avalie antecipar o lote da semana se conseguir desconto à vista.',
    destaqueCor: 'amarelo',
  },
  {
    id: 'news-aco-minerio-ferro-alta-2026-11-24',
    materialId: '00000033',
    materialNome: 'Vergalhão CA-50 10 mm',
    ncm: '7214.20.00',
    categoria: 'aco',
    fonte: 'InfoMoney',
    articleUrl:
      'https://www.infomoney.com.br/mercados/preco-do-minerio-de-ferro-sobe-com-melhora-do-apetite-a-risco/',
    publishedAt: '2026-11-24T12:53:30Z',
    dataLabel: '24/11/2026',
    ordemRecencia: 5,
    sinal: 'ALTA',
    sinalLabel: 'Pressão de Alta no Aço',
    titulo:
      'Preço do minério de ferro sobe no mercado externo e reforça viés de alta nas tabelas de aço e vergalhões',
    gatilhos: 'Minério de ferro internacional · Custo siderúrgico · Reposição de estoques na Ásia',
    impactoBalcao:
      'Com o minério de ferro em recuperação e projeção de alta para dezembro no vergalhão 10 mm, vale travar a reposição antes que distribuidoras e usinas atualizem a tabela da virada de mês.',
    destaqueCor: 'amarelo',
  },

  // === ÚLTIMO MÊS (<= 30 dias) ===
  {
    id: 'news-tintas-petroleo-queda-2026-11-18',
    materialId: '00007356',
    materialNome: 'Tinta Acrílica 18 L',
    ncm: '3209.10.10',
    categoria: 'tintas',
    fonte: 'InfoMoney',
    articleUrl:
      'https://www.infomoney.com.br/mercados/petroleo-fecha-em-queda-com-perspectiva-de-excesso-de-oferta/',
    publishedAt: '2026-11-18T21:07:41Z',
    dataLabel: '18/11/2026',
    ordemRecencia: 6,
    sinal: 'QUEDA',
    sinalLabel: 'Alívio em Solventes',
    titulo:
      'Excesso de oferta no petróleo alivia pressão sobre solventes e resinas acrílicas na indústria química',
    gatilhos: 'Solventes e derivados petroquímicos · Resina acrílica · Custo fabril de tintas',
    impactoBalcao:
      'A folga nos derivados químicos e o ritmo moderado de vendas permitem negociar bonificação e preços melhores nas latas de 18 L. Evite imobilizar caixa comprando lote acima da demanda.',
    destaqueCor: 'azul',
  },
  {
    id: 'news-agregados-frete-ifr-2026-11-17',
    materialId: '00004721',
    materialNome: 'Brita 1',
    ncm: '2517.10.00',
    categoria: 'agregados',
    fonte: 'Jornal do Comércio',
    articleUrl:
      'https://www.jornaldocomercio.com/cadernos/jc-logistica/2026/11/1270451-aumento-do-diesel-leva-a-reajuste-no-frete-rodoviario-informa-ifr.html',
    publishedAt: '2026-11-17T12:00:00Z',
    dataLabel: '17/11/2026',
    ordemRecencia: 7,
    sinal: 'ALTA',
    sinalLabel: 'Pressão no Frete',
    titulo:
      'Frete rodoviário sobe mais de 3% e chega a R$ 9,05/km, pressionando o custo de entrega de brita e agregados',
    gatilhos: 'Índice de Frete Rodoviário (R$ 9,05/km) · Custo do diesel · Carreto pesado',
    impactoBalcao:
      'Como o frete representa grande parte do preço final da brita no pátio, qualquer reajuste por quilômetro rodado encarece entregas fracionadas. Consolide cargas fechadas com a pedreira.',
    destaqueCor: 'amarelo',
  },
  {
    id: 'news-tintas-abramat-vendas-2026-11-12',
    materialId: '00007356',
    materialNome: 'Tinta Acrílica 18 L',
    ncm: '3209.10.10',
    categoria: 'tintas',
    fonte: 'CNN Brasil',
    articleUrl:
      'https://www.cnnbrasil.com.br/economia/money/macroeconomia/vendas-de-materiais-de-construcao-devem-recuar-mais-em-2026-diz-abramat/',
    publishedAt: '2026-11-12T22:11:31Z',
    dataLabel: '12/11/2026',
    ordemRecencia: 8,
    sinal: 'QUEDA',
    sinalLabel: 'Espaço para Desconto',
    titulo:
      'Abramat reduz projeção de vendas de materiais de construção para queda de 1,3% em 2026',
    gatilhos: 'Vendas da indústria (Abramat) · Juros altos no varejo · Capacidade ociosa em acabamento',
    impactoBalcao:
      'Com o varejo de acabamento mais contido, distribuidores de tintas ficam mais abertos a oferecer desconto e prazo em latas de 18 L. Compre sob giro e negocie condição melhor com o representante.',
    destaqueCor: 'azul',
  },
  {
    id: 'news-cimento-snic-outubro-2026-11-09',
    materialId: '00001379',
    materialNome: 'Cimento CP II 50 kg',
    ncm: '2523.29.10',
    categoria: 'cimento',
    fonte: 'Portal ABCP',
    articleUrl: 'https://abcp.org.br/venda-de-cimento-no-brasil-desacelera-em-outubro/',
    publishedAt: '2026-11-09T18:10:41Z',
    dataLabel: '09/11/2026',
    ordemRecencia: 9,
    sinal: 'ESTAVEL',
    sinalLabel: 'Demanda Moderada',
    titulo:
      'Venda de cimento no Brasil desacelera 6,1% em outubro com chuvas e juros altos no varejo, aponta SNIC',
    gatilhos: 'Consumo nacional (5,9 mi t) · Chuvas no Sul/Sudeste · Estabilidade no acumulado do ano',
    impactoBalcao:
      'A desaceleração recente nas entregas das cimenteiras reduz o risco de falta imediata e segura reajustes fortes no saco de 50 kg. Mantenha estoque enxuto para 2 a 3 semanas e evite empedramento no pátio.',
    destaqueCor: 'azul',
  },
  {
    id: 'news-eletrica-metais-banco-mundial-2026-11-04',
    materialId: '00000984',
    materialNome: 'Cabo Flexível 2,5 mm²',
    ncm: '8544.49.00',
    categoria: 'eletrica',
    fonte: 'Brasil Mineral',
    articleUrl:
      'https://brasilmineral.com.br/noticias/banco-mundial-preve-alta-de-23-nas-commodities-e-recorde-dos-metais-em-2026',
    publishedAt: '2026-11-04T11:33:31Z',
    dataLabel: '04/11/2026',
    ordemRecencia: 10,
    sinal: 'ATENCAO',
    sinalLabel: 'Atenção no Cobre',
    titulo:
      'Banco Mundial projeta patamar recorde para metais industriais como cobre e alumínio com demanda elétrica',
    gatilhos: 'Cobre e alumínio na LME · Redes elétricas e data centers · Câmbio dólar',
    impactoBalcao:
      'Mesmo com o preço local estável nesta quinzena, o cobre segue em nível estrutural elevado lá fora. Não deixe o rolo de cabo 2,5 mm² faltar na prateleira e monitore cotações em dólar.',
    destaqueCor: 'amarelo',
  },
  {
    id: 'news-aco-gerdau-divinopolis-2026-11-04',
    materialId: '00000033',
    materialNome: 'Vergalhão CA-50 10 mm',
    ncm: '7214.20.00',
    categoria: 'aco',
    fonte: 'O Petróleo',
    articleUrl:
      'https://opetroleo.com.br/gerdau-encerra-producao-de-aco-em-minas-e-decisao-afeta-cerca-de-mil-trabalhadores/',
    publishedAt: '2026-11-04T10:47:34Z',
    dataLabel: '04/11/2026',
    ordemRecencia: 11,
    sinal: 'ATENCAO',
    sinalLabel: 'Atenção na Oferta',
    titulo:
      'Gerdau encerra produção de aço em unidade de Divinópolis (MG) citando perda de competitividade e importados',
    gatilhos: 'Capacidade nacional de aços longos · Concorrência com importados · Custo de minério',
    impactoBalcao:
      'Ajustes de capacidade nas usinas brasileiras e disputas por tarifas de importação podem gerar repasses rápidos nas distribuidoras regionais. Compare duas ou três marcas antes de fechar pedido.',
    destaqueCor: 'amarelo',
  },
  {
    id: 'news-cimento-aneel-bandeira-verde-2026-10-30',
    materialId: '00001379',
    materialNome: 'Cimento CP II 50 kg',
    ncm: '2523.29.10',
    categoria: 'cimento',
    fonte: 'g1 Economia',
    articleUrl:
      'https://g1.globo.com/economia/noticia/2026/10/30/conta-de-luz-aneel-mantem-bandeira-tarifaria-para-verde-em-novembro.ghtml',
    publishedAt: '2026-10-30T15:00:00Z',
    dataLabel: '30/10/2026',
    ordemRecencia: 12,
    sinal: 'ESTAVEL',
    sinalLabel: 'Alívio na Energia',
    titulo:
      'Conta de luz: Aneel mantém bandeira verde em novembro e evita custo extra na moagem de cimento',
    gatilhos: 'Energia elétrica (bandeira verde) · Custo de moagem do clínquer · Indústria de base',
    impactoBalcao:
      'Sem taxa extra na conta de luz industrial em novembro, as cimenteiras ganharam fôlego nos custos de fábrica, ajudando a segurar a tabela do saco de 50 kg neste mês.',
    destaqueCor: 'azul',
  },
];

const SAO_PAULO_TZ = 'America/Sao_Paulo';

function getSaoPauloDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((p) => [p.type, Number(p.value)]));
  return {
    year: lookup.year,
    month: lookup.month,
    day: lookup.day,
  };
}

export function formatNewsDateLabel(publishedAt: string, now: Date = new Date()): string {
  const pubDate = new Date(publishedAt);
  if (Number.isNaN(pubDate.getTime())) {
    return '--/--';
  }

  const pubParts = getSaoPauloDateParts(pubDate);
  const nowParts = getSaoPauloDateParts(now);

  const pubUtcDay = Date.UTC(pubParts.year, pubParts.month - 1, pubParts.day);
  const nowUtcDay = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
  const diffDays = Math.round((nowUtcDay - pubUtcDay) / (24 * 60 * 60 * 1000));

  const dd = String(pubParts.day).padStart(2, '0');
  const mm = String(pubParts.month).padStart(2, '0');

  if (diffDays === 0) {
    return `Hoje · ${dd}/${mm}`;
  }
  if (diffDays === 1) {
    return `Ontem · ${dd}/${mm}`;
  }
  return `${dd}/${mm}/${pubParts.year}`;
}

export function isWithinNewsTimeRange(
  publishedAt: string,
  range: NewsTimeRange,
  referenceNowIso: string = new Date().toISOString()
): boolean {
  const pubMs = Date.parse(publishedAt);
  const refMs = Date.parse(referenceNowIso);
  if (Number.isNaN(pubMs) || Number.isNaN(refMs)) return false;

  const option = NEWS_TIME_RANGES.find((r) => r.id === range);
  const maxMs = (option ? option.maxHours : 24 * 30) * 60 * 60 * 1000;
  const ageMs = refMs - pubMs;
  return ageMs >= -5 * 60 * 1000 && ageMs <= maxMs;
}

export function getUpdatedMarketNews(
  timeRange: NewsTimeRange = 'mes',
  category: NewsCategory = 'todos',
  sourceItems: MarketNewsItem[] = MARKET_NEWS_ITEMS,
  referenceNowIso: string = new Date().toISOString()
): MarketNewsItem[] {
  const now = new Date(referenceNowIso);
  return sourceItems
    .filter(
      (item) =>
        isWithinNewsTimeRange(item.publishedAt, 'mes', referenceNowIso) &&
        isWithinNewsTimeRange(item.publishedAt, timeRange, referenceNowIso) &&
        (category === 'todos' || item.categoria === category)
    )
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.ordemRecencia - b.ordemRecencia)
    .map((item, index) => ({
      ...item,
      ordemRecencia: index + 1,
      dataLabel: formatNewsDateLabel(item.publishedAt, now),
    }));
}

export function resolveMaterialNcm(materialId: string, insumoName?: string): string | null {
  if (MATERIAL_NCM_MAP[materialId]) {
    return MATERIAL_NCM_MAP[materialId];
  }
  if (!insumoName) return null;
  const lower = insumoName.toLowerCase();
  if (lower.includes('vergalhão') || lower.includes('vergalhao')) return '7214.20.00';
  if (lower.includes('cimento')) return '2523.29.10';
  if (lower.includes('areia')) return '2505.10.00';
  if (lower.includes('brita')) return '2517.10.00';
  if (lower.includes('bloco')) return '6904.10.00';
  if (lower.includes('argamassa')) return '3824.50.00';
  if (lower.includes('tinta')) return '3209.10.10';
  if (lower.includes('pvc') || lower.includes('tubo')) return '3917.23.00';
  if (lower.includes('cabo')) return '8544.49.00';
  return null;
}

export function getNewsForMaterial(
  materialId: string,
  insumoName?: string,
  limit = 2,
  sourceItems: MarketNewsItem[] = MARKET_NEWS_ITEMS
): MarketNewsItem[] {
  const ncm = resolveMaterialNcm(materialId, insumoName);
  if (!ncm) return [];

  return getUpdatedMarketNews('mes', 'todos', sourceItems)
    .filter((item) => item.ncm === ncm || item.materialId === materialId)
    .slice(0, limit);
}
