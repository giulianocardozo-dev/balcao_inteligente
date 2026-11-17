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

export const NEWS_SNAPSHOT_TIME = '2026-11-17T15:00:00Z';

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
  '00034549': '6904.10.00', // Bloco cerâmico 9x19x39 (furos verticais)
  '00001381': '3824.50.00', // Argamassa AC-II 20 kg
  '00007356': '3209.10.10', // Tinta acrílica 18 L
  '00009869': '3917.23.00', // Tubo PVC esgoto 100 mm
  '00000984': '8544.49.00', // Cabo flexível 2,5 mm²
};

export const MARKET_NEWS_ITEMS: MarketNewsItem[] = [
  // === ÚLTIMAS 24 HORAS (<= 24h) ===
  {
    id: 'news-eletrica-aluminio-fundicao-2026-11-17',
    materialId: '00000984',
    materialNome: 'Cabo Flexível 2,5 mm²',
    ncm: '8544.49.00',
    categoria: 'eletrica',
    fonte: 'InfoMoney',
    articleUrl:
      'https://www.infomoney.com.br/business/rio-tinto-assina-acordo-para-reativar-fundicao-de-aluminio-na-nova-zelandia/',
    publishedAt: '2026-11-17T09:29:32Z',
    dataLabel: 'Hoje · 17/11',
    ordemRecencia: 1,
    sinal: 'ESTAVEL',
    sinalLabel: 'Oferta em Ajuste',
    titulo:
      'Rio Tinto fecha contrato de energia para reativar fundição de alumínio e ampliar oferta de metais condutores',
    gatilhos: 'Alumínio (condutores e cabos) · Contrato de energia elétrica (50 MW) · Cadeia global',
    impactoBalcao:
      'A retomada de capacidade no alumínio ajuda a segurar parte da pressão nos cabos elétricos após a escalada dos metais. Cotações de fios de cobre e alumínio seguem sensíveis ao dólar, então compare marcas antes de fechar lote grande.',
    destaqueCor: 'azul',
  },
  {
    id: 'news-cimento-energia-leilao-2026-11-17',
    materialId: '00001379',
    materialNome: 'Cimento CP II 50 kg',
    ncm: '2523.29.10',
    categoria: 'cimento',
    fonte: 'CNN Brasil',
    articleUrl:
      'https://www.cnnbrasil.com.br/infra/inabilitacao-de-usinas-da-epp-pode-elevar-custo-para-o-consumidor/',
    publishedAt: '2026-11-17T07:30:20Z',
    dataLabel: 'Hoje · 17/11',
    ordemRecencia: 2,
    sinal: 'ATENCAO',
    sinalLabel: 'Atenção no Custo de Energia',
    titulo:
      'Inabilitação de usinas em leilão de energia pode elevar conta de luz e pesar na moagem industrial',
    gatilhos: 'Energia elétrica na moagem · Leilão de reserva · Custo industrial do cimento',
    impactoBalcao:
      'Fábricas de cimento consomem muita energia na moagem do clínquer, e qualquer encarecimento na conta de luz vira repasse de tabela. Fique atento ao prazo de entrega e evite deixar o estoque de sacos 50 kg baixar demais.',
    destaqueCor: 'amarelo',
  },
  {
    id: 'news-pvc-petroleo-queda-2026-11-16',
    materialId: '00009869',
    materialNome: 'Tubo PVC Esgoto 100 mm',
    ncm: '3917.23.00',
    categoria: 'pvc',
    fonte: 'InfoMoney',
    articleUrl:
      'https://www.infomoney.com.br/mercados/petroleo-fecha-em-queda-de-3-com-aumento-da-oferta-no-oriente-medio/',
    publishedAt: '2026-11-16T21:17:22Z',
    dataLabel: 'Ontem · 16/11',
    ordemRecencia: 3,
    sinal: 'QUEDA',
    sinalLabel: 'Alívio na Matéria-Prima',
    titulo:
      'Petróleo cai mais de 3% com aumento da oferta no Oriente Médio e tira pressão futura sobre resinas PVC',
    gatilhos: 'Petróleo / nafta e eteno · Matéria-prima de tubos PVC e conexões · Frete de longo prazo',
    impactoBalcao:
      'Como a resina PVC nasce dos derivados de petróleo, a queda da cotação lá fora reduz a chance de aumento imediato nas tabelas de tubos. Compre apenas para repor o giro normal da semana e peça condição melhor no atacado.',
    destaqueCor: 'azul',
  },

  // === ÚLTIMA SEMANA (<= 7 dias) ===
  {
    id: 'news-agregados-diesel-bomba-2026-11-16',
    materialId: '00000370',
    materialNome: 'Areia Média',
    ncm: '2505.10.00',
    categoria: 'agregados',
    fonte: 'CNN Brasil',
    articleUrl:
      'https://www.cnnbrasil.com.br/blogs/jorge-moraes/auto/diesel-mais-caro-veja-quanto-fica-na-bomba-o-oleo-sem-o-subsidio-federal/',
    publishedAt: '2026-11-16T10:52:28Z',
    dataLabel: 'Ontem · 16/11',
    ordemRecencia: 4,
    sinal: 'ALTA',
    sinalLabel: 'Pressão no Frete',
    titulo:
      'Fim do adicional de R$ 1,40 no diesel importado pode encarecer a bomba e o carreto da caçamba',
    gatilhos: 'Óleo diesel na bomba · Fim da subvenção extra de R$ 1,40/L · Frete rodoviário',
    impactoBalcao:
      'Na areia média, o frete do caminhão pesa forte no custo final posto na loja, e o fim do desconto extra no diesel já acende alerta nas transportadoras. Feche carga completa sempre que possível para diluir o valor do carreto.',
    destaqueCor: 'amarelo',
  },
  {
    id: 'news-argamassa-construcao-cbic-2026-11-16',
    materialId: '00001381',
    materialNome: 'Argamassa AC-II 20 kg',
    ncm: '3824.50.00',
    categoria: 'cimento',
    fonte: 'InfoMoney',
    articleUrl:
      'https://www.infomoney.com.br/economia/construcao-civil-crescimento-desafios-juros-mao-de-obra/',
    publishedAt: '2026-11-16T08:00:00Z',
    dataLabel: 'Ontem · 16/11',
    ordemRecencia: 5,
    sinal: 'ESTAVEL',
    sinalLabel: 'Demanda Moderada',
    titulo:
      'Construção cresce 1,2% em ritmo moderado, mas juros altos seguram encomendas de acabamento',
    gatilhos: 'Demanda de obra e acabamento · Juros restritivos · Mão de obra no canteiro',
    impactoBalcao:
      'Com o ritmo das obras mais contido pelos juros, as fábricas de argamassa enfrentam mais dificuldade para empurrar reajustes fortes no balcão. Aproveite para negociar prazo de pagamento maior na reposição de sacos de 20 kg.',
    destaqueCor: 'azul',
  },
  {
    id: 'news-aco-tarifas-consumo-2026-11-14',
    materialId: '00000033',
    materialNome: 'Vergalhão CA-50 10 mm',
    ncm: '7214.20.00',
    categoria: 'aco',
    fonte: 'InfoMoney',
    articleUrl:
      'https://www.infomoney.com.br/economia/alem-das-tarifas-o-que-o-brasil-precisa-fazer-para-proteger-a-industria-do-aco/',
    publishedAt: '2026-11-14T10:56:00Z',
    dataLabel: '14/11/2026',
    ordemRecencia: 6,
    sinal: 'ATENCAO',
    sinalLabel: 'Atenção nas Usinas',
    titulo:
      'Consumo de aço laminado recua 2,7% no Brasil em 2026 e usinas pressionam por mais barreiras a importados',
    gatilhos: 'Consumo de aço laminado (26,1 mi t) · Tarifas de importação · Gerdau / ArcelorMittal / CSN',
    impactoBalcao:
      'Com a venda mais fraca no mercado interno e pressão por travas contra o aço importado, as usinas ficam divididas entre segurar preço ou tentar repasse. Só antecipe vergalhão se conseguir desconto à vista abaixo da sua média.',
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
    ordemRecencia: 7,
    sinal: 'QUEDA',
    sinalLabel: 'Espaço para Desconto',
    titulo:
      'Abramat reduz projeção de vendas de materiais de construção para queda de 1,3% em 2026',
    gatilhos: 'Vendas da indústria (Abramat) · Juros altos no varejo · Capacidade ociosa em acabamento',
    impactoBalcao:
      'Com a indústria vendendo abaixo do esperado, distribuidores de tintas ficam mais abertos a oferecer bonificação e desconto em latas de 18 L. Não carregue estoque parado: compre sob giro e negocie melhor condição com o representante.',
    destaqueCor: 'azul',
  },
  {
    id: 'news-agregados-energia-bandeira-verde-2026-11-12',
    materialId: '00004721',
    materialNome: 'Brita 1',
    ncm: '2517.10.00',
    categoria: 'agregados',
    fonte: 'Agência Brasil',
    articleUrl:
      'https://agenciabrasil.ebc.com.br/economia/noticia/2026-11/inflacao-perde-forca-e-fica-em-014-em-outubro-conta-de-luz-cai',
    publishedAt: '2026-11-12T16:18:00Z',
    dataLabel: '12/11/2026',
    ordemRecencia: 8,
    sinal: 'ESTAVEL',
    sinalLabel: 'Alívio na Britagem',
    titulo:
      'Bandeira verde derruba conta de luz em outubro e alivia custo elétrico das pedreiras',
    gatilhos: 'Energia elétrica (bandeira verde) · Custo de britagem · IPCA de 0,14%',
    impactoBalcao:
      'A queda recente na energia elétrica ajuda a conter o custo de produção dentro das pedreiras de brita. O que ainda pode mexer no preço entregue no seu pátio é o frete do caminhão.',
    destaqueCor: 'azul',
  },
  {
    id: 'news-aco-alacero-china-2026-11-10',
    materialId: '00000033',
    materialNome: 'Vergalhão CA-50 10 mm',
    ncm: '7214.20.00',
    categoria: 'aco',
    fonte: 'InfoMoney',
    articleUrl:
      'https://www.infomoney.com.br/mercados/alacero-avanco-predatorio-china-industria-latino-americana/',
    publishedAt: '2026-11-10T19:24:45Z',
    dataLabel: '10/11/2026',
    ordemRecencia: 9,
    sinal: 'ATENCAO',
    sinalLabel: 'Atenção na Oferta',
    titulo:
      'Entidade do aço alerta para entrada forte de material chinês e disputa acirrada de preços na região',
    gatilhos: 'Aço importado da China · Prêmio de importação · Defesa comercial',
    impactoBalcao:
      'Enquanto o aço importado continuar entrando forte, as distribuidoras seguram reajustes para não perder pedido. Mas fique de olho em novas medidas de proteção do governo, que podem virar a tabela rápido.',
    destaqueCor: 'amarelo',
  },

  // === ÚLTIMO MÊS (<= 30 dias) ===
  {
    id: 'news-eletrica-cobre-mt-2026-11-10',
    materialId: '00000984',
    materialNome: 'Cabo Flexível 2,5 mm²',
    ncm: '8544.49.00',
    categoria: 'eletrica',
    fonte: 'CNN Brasil',
    articleUrl:
      'https://www.cnnbrasil.com.br/infra/projeto-de-cobre-em-mt-atrai-propostas-de-financiamento-de-us-400-milhoes/',
    publishedAt: '2026-11-10T09:02:06Z',
    dataLabel: '10/11/2026',
    ordemRecencia: 10,
    sinal: 'ATENCAO',
    sinalLabel: 'Atenção no Cobre',
    titulo:
      'Projeto de cobre em Mato Grosso entra em pré-construção com US$ 400 milhões em propostas para ampliar oferta',
    gatilhos: 'Oferta futura de cobre · Investimento mineral · Cadeia de fios e cabos elétricos',
    impactoBalcao:
      'O aumento da oferta nacional de cobre só chega ao mercado nos próximos anos e não alivia o preço de balcão agora. Mantenha o estoque de cabo 2,5 mm² protegido para pelo menos duas semanas de vendas.',
    destaqueCor: 'azul',
  },
  {
    id: 'news-agregados-frota-frete-2026-11-04',
    materialId: '00004721',
    materialNome: 'Brita 1',
    ncm: '2517.10.00',
    categoria: 'agregados',
    fonte: 'CNN Brasil',
    articleUrl:
      'https://www.cnnbrasil.com.br/blogs/jenifer-ribeiro/infra/com-frete-em-alta-ferrovias-e-hidrovias-ganham-espaco-aponta-xp/',
    publishedAt: '2026-11-04T07:30:49Z',
    dataLabel: '04/11/2026',
    ordemRecencia: 11,
    sinal: 'ALTA',
    sinalLabel: 'Pressão de Alta',
    titulo:
      'Frota menor de caminhões e mudanças tributárias devem encarecer o frete rodoviário a partir de 2027',
    gatilhos: 'Frota rodoviária reduzida · Reforma tributária (PIS/Cofins) · Frete pesado',
    impactoBalcao:
      'Com menos caminhões disponíveis e reajustes contratuais já cotados para o início do ano, o transporte de brita e pedra britada tende a ficar mais caro. Vale consolidar entregas maiores com o fornecedor.',
    destaqueCor: 'amarelo',
  },
  {
    id: 'news-agregados-ormuz-diesel-2026-11-03',
    materialId: '00000370',
    materialNome: 'Areia Média',
    ncm: '2505.10.00',
    categoria: 'agregados',
    fonte: 'CNN Brasil',
    articleUrl:
      'https://www.cnnbrasil.com.br/blogs/jorge-moraes/auto/fluxo-de-petroleo-em-ormuz-segue-abaixo-e-pressiona-diesel-no-brasil/',
    publishedAt: '2026-11-03T20:59:43Z',
    dataLabel: '03/11/2026',
    ordemRecencia: 12,
    sinal: 'ALTA',
    sinalLabel: 'Pressão de Alta',
    titulo:
      'Fluxo reduzido de navios no Estreito de Ormuz mantém pressão externa sobre o preço do diesel',
    gatilhos: 'Petróleo internacional (-51% no escoamento em Ormuz) · Diesel importado · Frete de agregados',
    impactoBalcao:
      'Mesmo com oscilações diárias, o risco externo ainda deixa o diesel caro no Brasil e encarece o frete da caçamba de areia. Programe os pedidos com antecedência para não pagar frete de emergência.',
    destaqueCor: 'amarelo',
  },
  {
    id: 'news-cimento-icms-diesel-2026-10-28',
    materialId: '00001379',
    materialNome: 'Cimento CP II 50 kg',
    ncm: '2523.29.10',
    categoria: 'cimento',
    fonte: 'Exame',
    articleUrl:
      'https://exame.com/economia/estados-aprovam-aumento-do-icms-sobre-gasolina-diesel-e-gas-de-cozinha-a-partir-de-2027/',
    publishedAt: '2026-10-28T18:12:07Z',
    dataLabel: '28/10/2026',
    ordemRecencia: 13,
    sinal: 'ALTA',
    sinalLabel: 'Tendência de Alta no Frete',
    titulo:
      'Estados aprovam aumento de 11,1% no ICMS do diesel para fevereiro de 2027 e elevam custo futuro do frete',
    gatilhos: 'ICMS do diesel (+R$ 0,13/L em fev/2027) · Frete rodoviário de carga pesada',
    impactoBalcao:
      'O imposto maior sobre o diesel entra em vigor em fevereiro e vai pesar no frete dos caminhões que trazem cimento da fábrica até a loja. Considere isso ao planejar o tamanho dos lotes da virada de ano.',
    destaqueCor: 'amarelo',
  },
  {
    id: 'news-argamassa-subvencao-diesel-2026-10-27',
    materialId: '00001381',
    materialNome: 'Argamassa AC-II 20 kg',
    ncm: '3824.50.00',
    categoria: 'cimento',
    fonte: 'g1 Economia',
    articleUrl:
      'https://g1.globo.com/economia/noticia/2026/10/27/governo-prorroga-subvencao-ao-diesel-por-mais-30-dias.ghtml',
    publishedAt: '2026-10-27T12:00:00Z',
    dataLabel: '27/10/2026',
    ordemRecencia: 14,
    sinal: 'ESTAVEL',
    sinalLabel: 'Frete Segurado no Curto Prazo',
    titulo:
      'Prorrogação de subsídio de R$ 2,12 por litro no diesel segura disparada imediata no frete rodoviário',
    gatilhos: 'Subsídio de R$ 2,12/L no diesel · Petróleo acima de US$ 100 · Logística de sacaria',
    impactoBalcao:
      'A manutenção da trava principal de R$ 2,12/L no diesel evitou um salto brusco no frete das entregas de argamassa AC-II. Acompanhe o vencimento do prazo para não ser pego de surpresa na próxima renovação.',
    destaqueCor: 'azul',
  },
  {
    id: 'news-ceramica-leilao-gas-2026-10-22',
    materialId: '00000731',
    materialNome: 'Bloco Cerâmico 9x19x39',
    ncm: '6904.10.00',
    categoria: 'ceramica',
    fonte: 'CNN Brasil',
    articleUrl:
      'https://www.cnnbrasil.com.br/infra/industria-ceramista-arremata-200-mil-m3-dia-no-leilao-de-gas-da-uniao/',
    publishedAt: '2026-10-22T13:30:03Z',
    dataLabel: '22/10/2026',
    ordemRecencia: 15,
    sinal: 'ATENCAO',
    sinalLabel: 'Atenção na Oferta',
    titulo:
      'Indústria ceramista arremata 200 mil m³/dia no leilão de gás da União para conter custo de forno',
    gatilhos: 'Gás natural (energia térmica dos fornos) · Lotes a partir de US$ 1,86/MMBtu · Entrega em 2027',
    impactoBalcao:
      'As olarias estão travando gás mais barato para 2027, mas o alívio no custo do forno ainda não chegou ao pátio hoje. Programe o pedido de blocos cerâmicos antes de baixar a pilha para evitar frete urgente.',
    destaqueCor: 'azul',
  },
];

export function isWithinNewsTimeRange(
  publishedAt: string,
  range: NewsTimeRange,
  referenceNowIso = NEWS_SNAPSHOT_TIME
): boolean {
  const pubMs = Date.parse(publishedAt);
  const refMs = Date.parse(referenceNowIso);
  if (Number.isNaN(pubMs) || Number.isNaN(refMs)) return false;

  const option = NEWS_TIME_RANGES.find((r) => r.id === range);
  const maxMs = (option ? option.maxHours : 24 * 30) * 60 * 60 * 1000;
  const ageMs = refMs - pubMs;
  return ageMs >= 0 && ageMs <= maxMs;
}

export function getUpdatedMarketNews(
  timeRange: NewsTimeRange = 'mes',
  category: NewsCategory = 'todos'
): MarketNewsItem[] {
  return MARKET_NEWS_ITEMS.filter(
    (item) =>
      isWithinNewsTimeRange(item.publishedAt, 'mes') &&
      isWithinNewsTimeRange(item.publishedAt, timeRange) &&
      (category === 'todos' || item.categoria === category)
  ).sort((a, b) => a.ordemRecencia - b.ordemRecencia);
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
  limit = 2
): MarketNewsItem[] {
  const ncm = resolveMaterialNcm(materialId, insumoName);
  if (!ncm) return [];

  return getUpdatedMarketNews('mes', 'todos')
    .filter((item) => item.ncm === ncm || item.materialId === materialId)
    .slice(0, limit);
}
