export type TrafficLightStatus =
  | 'COMPRAR_AGORA'
  | 'ANTECIPAR_COMPRA'
  | 'NAO_COMPRAR'
  | 'AGUARDAR';

export type PriceTrend = 'alta' | 'queda' | 'estavel';

export type AppTab = 'hoje' | 'detalhe' | 'simular' | 'previsao' | 'noticias';

export type NewsCategory =
  | 'todos'
  | 'aco'
  | 'cimento'
  | 'pvc'
  | 'tintas'
  | 'eletrica'
  | 'agregados'
  | 'ceramica';

export type NewsSignal = 'ALTA' | 'QUEDA' | 'ATENCAO' | 'ESTAVEL';

export type NewsTimeRange = '24h' | 'semana' | 'mes';

export type ApprovedNewsSource =
  | 'Valor Econômico'
  | 'InfoMoney'
  | 'Exame'
  | 'Money Times'
  | 'g1 Economia'
  | 'CNN Brasil'
  | 'Agência Brasil';

export interface MarketNewsItem {
  id: string;
  materialId: string;
  materialNome: string;
  ncm: string;
  categoria: Exclude<NewsCategory, 'todos'>;
  fonte: ApprovedNewsSource;
  articleUrl: string;
  publishedAt: string; // ISO 8601 UTC/offset timestamp
  dataLabel: string;
  ordemRecencia: number; // smaller = more recent
  sinal: NewsSignal;
  sinalLabel: string;
  titulo: string;
  gatilhos: string;
  impactoBalcao: string;
  destaqueCor: 'amarelo' | 'azul';
}

export interface MonthlyPoint {
  month: string; // YYYY-MM
  price: number;
}

export interface ForecastPoint {
  month: string; // YYYY-MM
  prev: number;
  min: number;
  max: number;
}

export interface SinapiMaterialRecord {
  id: string; // normalized key: codigoSinapi || insumo
  uf: string;
  codigoSinapi: string;
  insumo: string;
  unidadeComercial: string;
  historico: MonthlyPoint[];
  previsoes: ForecastPoint[];
  varTrimestrePct: number;
}

export interface StoreInventoryConfig {
  estoqueAtual: number;
  vendas30d: number;
  diasEntrega: number;
  custoMedio: number;
  variacaoDemanda: number; // default 0.25 (25%)
}

export interface EvaluatedMaterial {
  record: SinapiMaterialRecord;
  config: StoreInventoryConfig;
  precoAtual: number;
  preco45d: number;
  min45d: number;
  max45d: number;
  preco90d: number;
  var45d: number;
  var90d: number;
  tendencia: PriceTrend;
  vendaDiaria: number;
  estoqueSeguranca: number;
  quandoPedirDeNovo: number;
  diasQueDura: number;
  quantidadeSugerida: number;
  status: TrafficLightStatus;
  economiaEstimada: number;
  dinheiroParado: number;
  diferencaCustoPct: number;
  diferencaCustoReais: number;
}

export interface DataSourceMeta {
  type: 'demo' | 'excel';
  fileName?: string;
  importedAt?: string;
  ufCount: number;
  materialCount: number;
}
