import {
  EvaluatedMaterial,
  ForecastPoint,
  PriceTrend,
  SinapiMaterialRecord,
  StoreInventoryConfig,
  TrafficLightStatus,
} from '../types/inventory';

export function classifyTrend(var45d: number): PriceTrend {
  if (var45d >= 0.015) return 'alta';
  if (var45d <= -0.015) return 'queda';
  return 'estavel';
}

export function evaluateMaterial(
  record: SinapiMaterialRecord,
  config: StoreInventoryConfig
): EvaluatedMaterial {
  const lastHist = record.historico[record.historico.length - 1];
  const precoAtual = lastHist ? lastHist.price : 0;

  const p1 = record.previsoes[0] ?? { month: '', prev: precoAtual, min: precoAtual, max: precoAtual };
  const p2 = record.previsoes[1] ?? p1;
  const p3 = record.previsoes[2] ?? p2;

  const preco45d = (p1.prev + p2.prev) / 2;
  const min45d = (p1.min + p2.min) / 2;
  const max45d = (p1.max + p2.max) / 2;
  const preco90d = p3.prev;

  const var45d = precoAtual > 0 ? preco45d / precoAtual - 1 : 0;
  const var90d =
    precoAtual > 0
      ? p3.prev > 0
        ? p3.prev / precoAtual - 1
        : record.varTrimestrePct / 100
      : 0;

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
    (status === 'COMPRAR_AGORA' || status === 'ANTECIPAR_COMPRA') && var45d > 0
      ? quantidadeSugerida * precoAtual * var45d
      : 0;

  const dinheiroParado = estoqueAtual * (config.custoMedio > 0 ? config.custoMedio : precoAtual);

  const custoRef = config.custoMedio > 0 ? config.custoMedio : precoAtual;
  const diferencaCustoReais = custoRef - precoAtual;
  const diferencaCustoPct = precoAtual > 0 ? custoRef / precoAtual - 1 : 0;

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

export function interpolateExpectedPrice(
  precoAtual: number,
  previsoes: ForecastPoint[],
  daysAhead: number
): number {
  const p30 = previsoes[0]?.prev ?? precoAtual;
  const p60 = previsoes[1]?.prev ?? p30;
  const p90 = previsoes[2]?.prev ?? p60;

  const d = Math.max(0, Math.min(90, daysAhead));
  if (d <= 30) {
    return precoAtual + ((p30 - precoAtual) * d) / 30;
  }
  if (d <= 60) {
    return p30 + ((p60 - p30) * (d - 30)) / 30;
  }
  return p60 + ((p90 - p60) * (d - 60)) / 30;
}

export function computeBuyOrWaitSimulation(params: {
  precoAtual: number;
  previsoes: ForecastPoint[];
  diasEntrega: number;
  diasQueDura: number;
  quantidade: number;
  precoCotado: number;
  diasEsperar: number;
}) {
  const quantidade = Math.max(1, params.quantidade);
  const precoCotado = Math.max(0.01, params.precoCotado);
  const diasEsperar = Math.max(1, Math.min(90, params.diasEsperar));

  const precoEsperadoNoPrazo = interpolateExpectedPrice(
    params.precoAtual,
    params.previsoes,
    diasEsperar
  );

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
