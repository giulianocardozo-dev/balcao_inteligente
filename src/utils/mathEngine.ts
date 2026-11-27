import {
  EvaluatedMaterial,
  ForecastPoint,
  PriceTrend,
  SinapiMaterialRecord,
  StorageLocation,
  StoreInventoryConfig,
  TrafficLightStatus,
} from '../types/inventory';

const SAO_PAULO_TZ = 'America/Sao_Paulo';

export function getNextMonthYYYYMM(referenceDate: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(referenceDate);

  const yearPart = parts.find((p) => p.type === 'year')?.value;
  const monthPart = parts.find((p) => p.type === 'month')?.value;

  const currentYear = yearPart ? Number(yearPart) : referenceDate.getFullYear();
  const currentMonth = monthPart ? Number(monthPart) : referenceDate.getMonth() + 1;

  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

export function selectNextMonthForecastIndex(
  previsoes: ForecastPoint[],
  referenceDate: Date = new Date()
): number {
  if (previsoes.length === 0) return -1;
  const nextMonth = getNextMonthYYYYMM(referenceDate);
  const exactIdx = previsoes.findIndex((p) => p.month === nextMonth);
  if (exactIdx >= 0) return exactIdx;

  const nextOrAfterIdx = previsoes.findIndex(
    (p) => /^\d{4}-\d{2}$/.test(p.month) && p.month >= nextMonth
  );
  if (nextOrAfterIdx >= 0) return nextOrAfterIdx;

  const hasIsoMonths = previsoes.some((p) => /^\d{4}-\d{2}$/.test(p.month));
  return hasIsoMonths ? previsoes.length - 1 : 0;
}

export function classifyTrend(var45d: number): PriceTrend {
  if (var45d >= 0.015) return 'alta';
  if (var45d <= -0.015) return 'queda';
  return 'estavel';
}

export function evaluateMaterial(
  record: SinapiMaterialRecord,
  config: StoreInventoryConfig,
  referenceDate: Date = new Date()
): EvaluatedMaterial {
  const lastHist = record.historico[record.historico.length - 1];
  const baseProjPrice = lastHist ? lastHist.price : 0;

  const sortedPrevisoes = [...record.previsoes].sort((a, b) =>
    a.month.localeCompare(b.month)
  );
  const fallbackPoint: ForecastPoint = {
    month: '',
    prev: baseProjPrice,
    min: baseProjPrice,
    max: baseProjPrice,
  };
  const targetIdx = selectNextMonthForecastIndex(sortedPrevisoes, referenceDate);
  const targetForecast = targetIdx >= 0 ? sortedPrevisoes[targetIdx] : fallbackPoint;
  const lastForecast =
    sortedPrevisoes[sortedPrevisoes.length - 1] ?? targetForecast;

  const proj45d = targetForecast.prev;
  const projMin45d = targetForecast.min;
  const projMax45d = targetForecast.max;

  const var45d = baseProjPrice > 0 ? proj45d / baseProjPrice - 1 : 0;
  const varMin45d = baseProjPrice > 0 ? projMin45d / baseProjPrice - 1 : 0;
  const varMax45d = baseProjPrice > 0 ? projMax45d / baseProjPrice - 1 : 0;
  const var90d =
    baseProjPrice > 0
      ? lastForecast.prev > 0
        ? lastForecast.prev / baseProjPrice - 1
        : record.varTrimestrePct / 100
      : 0;

  const precoReferenciaUsuario = Math.max(0, config.custoMedio);
  const precoAtual = precoReferenciaUsuario;
  const preco45d = precoReferenciaUsuario > 0 ? precoReferenciaUsuario * (1 + var45d) : 0;
  const min45d = precoReferenciaUsuario > 0 ? precoReferenciaUsuario * (1 + varMin45d) : 0;
  const max45d = precoReferenciaUsuario > 0 ? precoReferenciaUsuario * (1 + varMax45d) : 0;
  const preco90d = precoReferenciaUsuario > 0 ? precoReferenciaUsuario * (1 + var90d) : 0;

  const tendencia = classifyTrend(var45d);

  const vendas30d = Math.max(0, config.vendas30d);
  const diasEntrega = Math.max(1, config.diasEntrega);
  const estoqueAtual = Math.max(0, config.estoqueAtual);
  const variacaoDemanda = config.variacaoDemanda > 0 ? config.variacaoDemanda : 0.25;

  const vendaDiaria = vendas30d / 30;
  const estoqueSeguranca =
    1.65 * (vendaDiaria * variacaoDemanda) * Math.sqrt(diasEntrega);
  const quandoPedirDeNovo = Math.ceil(vendaDiaria * diasEntrega + estoqueSeguranca);
  const diasQueDura = vendaDiaria > 0 ? Math.floor(estoqueAtual / vendaDiaria) : 999;
  const quantidadeSugerida = Math.max(
    0,
    Math.ceil(vendaDiaria * (diasEntrega + 30) + estoqueSeguranca - estoqueAtual)
  );

  let status: TrafficLightStatus;
  if (estoqueAtual <= quandoPedirDeNovo) {
    status = 'COMPRAR_AGORA';
  } else if (tendencia === 'alta' && diasQueDura < diasEntrega + 30) {
    status = 'ANTECIPAR_COMPRA';
  } else if (tendencia === 'queda' && diasQueDura > diasEntrega + 7) {
    status = 'NAO_COMPRAR';
  } else {
    status = 'AGUARDAR';
  }

  const economiaEstimada =
    (status === 'COMPRAR_AGORA' || status === 'ANTECIPAR_COMPRA') &&
    var45d > 0 &&
    precoReferenciaUsuario > 0
      ? quantidadeSugerida * precoReferenciaUsuario * var45d
      : 0;

  const dinheiroParado = estoqueAtual * precoReferenciaUsuario;

  const diferencaCustoReais = 0;
  const diferencaCustoPct = 0;

  return {
    record,
    config,
    precoAtual,
    preco45d,
    min45d,
    max45d,
    preco90d,
    var45d,
    var90d,
    tendencia,
    vendaDiaria,
    estoqueSeguranca,
    quandoPedirDeNovo,
    diasQueDura,
    quantidadeSugerida,
    status,
    economiaEstimada,
    dinheiroParado,
    diferencaCustoPct,
    diferencaCustoReais,
  };
}

export function computeReorderSimulation(params: {
  vendas30d: number;
  diasEntrega: number;
  estoqueAtual: number;
  variacaoDemanda?: number;
}) {
  const vendas30d = Math.max(0, params.vendas30d);
  const diasEntrega = Math.max(1, params.diasEntrega);
  const estoqueAtual = Math.max(0, params.estoqueAtual);
  const variacaoDemanda = params.variacaoDemanda ?? 0.25;

  const vendaDiaria = vendas30d / 30;
  const estoqueSeguranca =
    1.65 * (vendaDiaria * variacaoDemanda) * Math.sqrt(diasEntrega);
  const quandoPedirDeNovo = Math.ceil(vendaDiaria * diasEntrega + estoqueSeguranca);
  const diasQueDura = vendaDiaria > 0 ? Math.floor(estoqueAtual / vendaDiaria) : 999;
  const quantidadeSugerida = Math.max(
    0,
    Math.ceil(vendaDiaria * (diasEntrega + 30) + estoqueSeguranca - estoqueAtual)
  );
  const diasAtePedir =
    vendaDiaria > 0 ? Math.max(0, Math.floor((estoqueAtual - quandoPedirDeNovo) / vendaDiaria)) : 999;

  return {
    vendaDiaria,
    estoqueSeguranca,
    quandoPedirDeNovo,
    diasQueDura,
    quantidadeSugerida,
    jaPassouDaHora: estoqueAtual <= quandoPedirDeNovo,
    diasAtePedir,
  };
}

export function interpolateProjectedVariationPct(
  baseProjPrice: number,
  previsoes: ForecastPoint[],
  daysAhead: number,
  referenceDate: Date = new Date()
): number {
  if (baseProjPrice <= 0) return 0;

  const sortedPrevisoes = [...previsoes].sort((a, b) =>
    a.month.localeCompare(b.month)
  );
  const targetIdx = selectNextMonthForecastIndex(sortedPrevisoes, referenceDate);
  const startIdx = targetIdx >= 0 ? targetIdx : 0;

  const f1 = sortedPrevisoes[startIdx];
  const f2 = sortedPrevisoes[startIdx + 1] ?? f1;
  const f3 = sortedPrevisoes[startIdx + 2] ?? f2;

  const v30 = f1 ? f1.prev / baseProjPrice - 1 : 0;
  const v60 = f2 ? f2.prev / baseProjPrice - 1 : v30;
  const v90 = f3 ? f3.prev / baseProjPrice - 1 : v60;

  const d = Math.max(0, Math.min(90, daysAhead));
  if (d <= 30) {
    return (v30 * d) / 30;
  }
  if (d <= 60) {
    return v30 + ((v60 - v30) * (d - 30)) / 30;
  }
  return v60 + ((v90 - v60) * (d - 60)) / 30;
}

export function computeBuyOrWaitSimulation(params: {
  baseProjPrice: number;
  precoReferenciaUsuario: number;
  previsoes: ForecastPoint[];
  diasEntrega: number;
  diasQueDura: number;
  quantidade: number;
  precoCotado: number;
  diasEsperar: number;
}) {
  const quantidade = Math.max(1, params.quantidade);
  const precoCotado = Math.max(0, params.precoCotado);
  const diasEsperar = Math.max(1, Math.min(90, params.diasEsperar));

  const variacaoProjetada = interpolateProjectedVariationPct(
    params.baseProjPrice,
    params.previsoes,
    diasEsperar
  );

  const baseCalculo =
    params.precoReferenciaUsuario > 0 ? params.precoReferenciaUsuario : precoCotado;
  const precoEsperadoNoPrazo = baseCalculo * (1 + variacaoProjetada);

  const custoHoje = quantidade * precoCotado;
  const custoEsperando = quantidade * precoEsperadoNoPrazo;
  const saldoComprarHoje = custoEsperando - custoHoje; // > 0 means buying today saves money

  // Wait causes stockout if waiting + delivery exceeds current stock duration
  const diasTotaisAteChegar = diasEsperar + params.diasEntrega;
  const riscoFaltaNoPatio =
    params.diasQueDura < 999 && diasTotaisAteChegar > params.diasQueDura;
  const diasSemProduto = riscoFaltaNoPatio
    ? diasTotaisAteChegar - params.diasQueDura
    : 0;

  return {
    variacaoProjetada,
    precoEsperadoNoPrazo,
    precoAlvoMaximo: precoEsperadoNoPrazo,
    custoHoje,
    custoEsperando,
    saldoComprarHoje,
    valeComprarHoje: riscoFaltaNoPatio || saldoComprarHoje >= 0,
    riscoFaltaNoPatio,
    diasSemProduto,
  };
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatBRLWhole(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatPercentSigned(decimal: number): string {
  const pct = decimal * 100;
  const sign = pct > 0.05 ? '+' : '';
  return `${sign}${pct.toFixed(1).replace('.', ',')}%`;
}

export function formatQty(value: number): string {
  return Math.round(value).toLocaleString('pt-BR');
}

const INVARIANT_UNITS = new Set([
  'm³',
  'm3',
  'm²',
  'm2',
  'm',
  'cm',
  'mm',
  'km',
  'kg',
  'g',
  'mg',
  't',
  'ton',
  'l',
  'ml',
  'un',
  'unid',
  'unid.',
  'und',
  'pc',
  'pç',
  'cx',
  'sc',
  'rl',
  'pct',
  'br',
  'lt',
  'gl',
  'fd',
  'mlh',
]);

const SINGULAR_TO_PLURAL_UNIT: Record<string, string> = {
  saco: 'sacos',
  barra: 'barras',
  lata: 'latas',
  rolo: 'rolos',
  milheiro: 'milheiros',
  unidade: 'unidades',
  caixa: 'caixas',
  peça: 'peças',
  peca: 'pecas',
  metro: 'metros',
  litro: 'litros',
  galão: 'galões',
  galao: 'galoes',
  balde: 'baldes',
  tubo: 'tubos',
  bloco: 'blocos',
  tijolo: 'tijolos',
  telha: 'telhas',
  chapa: 'chapas',
  placa: 'placas',
  folha: 'folhas',
  tábua: 'tábuas',
  tabua: 'tabuas',
  viga: 'vigas',
  caibro: 'caibros',
  ripa: 'ripas',
  sarrafo: 'sarrafos',
  pacote: 'pacotes',
  fardo: 'fardos',
  bisnaga: 'bisnagas',
  frasco: 'frascos',
  pote: 'potes',
  cartucho: 'cartuchos',
  bobina: 'bobinas',
  tambor: 'tambores',
  bombona: 'bombonas',
  tonelada: 'toneladas',
  kit: 'kits',
  jogo: 'jogos',
  par: 'pares',
  cento: 'centos',
  dúzia: 'dúzias',
  duzia: 'duzias',
  carrada: 'carradas',
  caçamba: 'caçambas',
  cacamba: 'cacambas',
  palete: 'paletes',
  pallet: 'pallets',
  ampola: 'ampolas',
  sachê: 'sachês',
  sache: 'saches',
};

const PLURAL_TO_SINGULAR_UNIT: Record<string, string> = Object.fromEntries(
  Object.entries(SINGULAR_TO_PLURAL_UNIT).map(([singular, plural]) => [plural, singular])
);

const COMPOUND_UNIT_PHRASES: Array<{ singular: string; plural: string }> = [
  { singular: 'metro quadrado', plural: 'metros quadrados' },
  { singular: 'metro linear', plural: 'metros lineares' },
  { singular: 'metro cúbico', plural: 'metros cúbicos' },
  { singular: 'metro cubico', plural: 'metros cubicos' },
];

function matchWordCasing(template: string, target: string): string {
  if (!template) return target;
  if (template === template.toUpperCase() && template !== template.toLowerCase()) {
    return target.toUpperCase();
  }
  const first = template[0];
  if (first === first.toUpperCase() && first !== first.toLowerCase()) {
    return target[0].toUpperCase() + target.slice(1);
  }
  return target;
}

function inflectPortugueseUnitWord(word: string, plural: boolean): string {
  const lower = word.toLowerCase();
  if (INVARIANT_UNITS.has(lower)) return word;

  if (!plural) {
    const mappedSingular = PLURAL_TO_SINGULAR_UNIT[lower];
    return mappedSingular ? matchWordCasing(word, mappedSingular) : word;
  }

  if (PLURAL_TO_SINGULAR_UNIT[lower]) {
    return word;
  }

  const mappedPlural = SINGULAR_TO_PLURAL_UNIT[lower];
  if (mappedPlural) {
    return matchWordCasing(word, mappedPlural);
  }

  // Fallback for custom Excel alphabetic unit words (e.g. "bisnaga", "tambor")
  if (!/^[a-zà-ú]{4,}$/i.test(lower) || lower.endsWith('s')) {
    return word;
  }

  let inflected = lower;
  if (lower.endsWith('ão')) {
    inflected = `${lower.slice(0, -2)}ões`;
  } else if (lower.endsWith('r') || lower.endsWith('z')) {
    inflected = `${lower}es`;
  } else if (
    lower.endsWith('al') ||
    lower.endsWith('el') ||
    lower.endsWith('ol') ||
    lower.endsWith('ul')
  ) {
    inflected = `${lower.slice(0, -1)}is`;
  } else if (lower.endsWith('m')) {
    inflected = `${lower.slice(0, -1)}ns`;
  } else if (/[aeiouáéíóúâêô]$/i.test(lower)) {
    inflected = `${lower}s`;
  }

  return matchWordCasing(word, inflected);
}

/**
 * Formats a commercial unit according to Portuguese singular/plural agreement.
 * Matches formatQty rounding: 1 -> singular, 0 or >= 2 -> plural.
 * When qty is omitted, returns the plural form (for field labels).
 */
export function formatUnit(unit: string, qty?: number): string {
  const trimmed = unit.trim();
  if (!trimmed) return '';

  const isPlural = qty === undefined ? true : Math.round(Math.abs(qty)) !== 1;
  const lower = trimmed.toLowerCase();

  if (INVARIANT_UNITS.has(lower)) {
    return trimmed;
  }

  for (const phrase of COMPOUND_UNIT_PHRASES) {
    if (lower === phrase.singular || lower === phrase.plural) {
      const target = isPlural ? phrase.plural : phrase.singular;
      return matchWordCasing(trimmed, target);
    }
  }

  const firstSpaceIdx = trimmed.search(/\s+/);
  if (firstSpaceIdx === -1) {
    return inflectPortugueseUnitWord(trimmed, isPlural);
  }

  const head = trimmed.slice(0, firstSpaceIdx);
  const rest = trimmed.slice(firstSpaceIdx);
  return `${inflectPortugueseUnitWord(head, isPlural)}${rest}`;
}

export function formatDays(days: number): string {
  const rounded = Math.round(days);
  return `${rounded} ${Math.abs(rounded) === 1 ? 'dia' : 'dias'}`;
}

export function formatMonthShort(yyyyMm: string): string {
  const parts = yyyyMm.split('-');
  if (parts.length !== 2) return yyyyMm;
  const year = parts[0].slice(-2);
  const monthIdx = Number(parts[1]) - 1;
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const label = meses[monthIdx] ?? parts[1];
  return `${label}/${year}`;
}

export function statusPriority(status: TrafficLightStatus): number {
  switch (status) {
    case 'COMPRAR_AGORA':
      return 0;
    case 'ANTECIPAR_COMPRA':
      return 1;
    case 'NAO_COMPRAR':
      return 2;
    case 'AGUARDAR':
      return 3;
  }
}

const PRATELEIRA_KEYWORDS = [
  'tinta',
  'cabo',
  'fio',
  'tubo',
  'pvc',
  'eletroduto',
  'interruptor',
  'tomada',
  'torneira',
  'registro',
  'parafuso',
  'fechadura',
  'verniz',
  'massa corrida',
  'selador',
];

export function getMaterialStorageLocation(
  record: Pick<SinapiMaterialRecord, 'insumo' | 'localArmazenamento'>
): StorageLocation {
  if (record.localArmazenamento === 'patio' || record.localArmazenamento === 'prateleira') {
    return record.localArmazenamento;
  }
  const normalized = record.insumo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (PRATELEIRA_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return 'prateleira';
  }
  return 'patio';
}

export function getStoragePreposition(
  record: Pick<SinapiMaterialRecord, 'insumo' | 'localArmazenamento'>
): 'no pátio' | 'na prateleira' {
  return getMaterialStorageLocation(record) === 'prateleira' ? 'na prateleira' : 'no pátio';
}

export function getStoragePrepositionCapitalized(
  record: Pick<SinapiMaterialRecord, 'insumo' | 'localArmazenamento'>
): 'No pátio' | 'Na prateleira' {
  return getMaterialStorageLocation(record) === 'prateleira' ? 'Na prateleira' : 'No pátio';
}
