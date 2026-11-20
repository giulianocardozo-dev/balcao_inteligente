import {
  ForecastPoint,
  MonthlyPoint,
  SinapiMaterialRecord,
  StorageLocation,
  StoreInventoryConfig,
} from '../types/inventory';

export const BRAZIL_UFS: { uf: string; nome: string; fator: number }[] = [
  { uf: 'AC', nome: 'Acre', fator: 1.15 },
  { uf: 'AL', nome: 'Alagoas', fator: 0.96 },
  { uf: 'AM', nome: 'Amazonas', fator: 1.14 },
  { uf: 'AP', nome: 'Amapá', fator: 1.12 },
  { uf: 'BA', nome: 'Bahia', fator: 0.95 },
  { uf: 'CE', nome: 'Ceará', fator: 0.94 },
  { uf: 'DF', nome: 'Distrito Federal', fator: 1.03 },
  { uf: 'ES', nome: 'Espírito Santo', fator: 0.98 },
  { uf: 'GO', nome: 'Goiás', fator: 0.97 },
  { uf: 'MA', nome: 'Maranhão', fator: 0.98 },
  { uf: 'MG', nome: 'Minas Gerais', fator: 0.96 },
  { uf: 'MS', nome: 'Mato Grosso do Sul', fator: 1.01 },
  { uf: 'MT', nome: 'Mato Grosso', fator: 1.04 },
  { uf: 'PA', nome: 'Pará', fator: 1.06 },
  { uf: 'PB', nome: 'Paraíba', fator: 0.95 },
  { uf: 'PE', nome: 'Pernambuco', fator: 0.96 },
  { uf: 'PI', nome: 'Piauí', fator: 0.97 },
  { uf: 'PR', nome: 'Paraná', fator: 0.98 },
  { uf: 'RJ', nome: 'Rio de Janeiro', fator: 1.04 },
  { uf: 'RN', nome: 'Rio Grande do Norte', fator: 0.96 },
  { uf: 'RO', nome: 'Rondônia', fator: 1.08 },
  { uf: 'RR', nome: 'Roraima', fator: 1.16 },
  { uf: 'RS', nome: 'Rio Grande do Sul', fator: 1.01 },
  { uf: 'SC', nome: 'Santa Catarina', fator: 1.02 },
  { uf: 'SE', nome: 'Sergipe', fator: 0.95 },
  { uf: 'SP', nome: 'São Paulo', fator: 1.0 },
  { uf: 'TO', nome: 'Tocantins', fator: 1.03 },
];

export const HISTORICAL_MONTHS_36: string[] = (() => {
  const months: string[] = [];
  let y = 2023;
  let m = 11;
  for (let i = 0; i < 36; i++) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months; // 2023-11 .. 2026-10
})();

export const FORECAST_MONTHS_3 = ['2026-11', '2026-12', '2027-01'];

interface MaterialSeed {
  codigoSinapi: string;
  insumo: string;
  unidadeComercial: string;
  localArmazenamento: StorageLocation;
  precoBaseSP: number;
  var1: number; // month +1 pct vs last hist
  var2: number; // month +2 pct vs last hist
  var3: number; // month +3 pct vs last hist
  drift36m: number; // historical drift over 36 months
  waveAmp: number;
  defaultStore: StoreInventoryConfig;
}

const MATERIAL_SEEDS: MaterialSeed[] = [
  {
    codigoSinapi: '00000033',
    insumo: 'Vergalhão CA-50 10 mm',
    unidadeComercial: 'kg',
    localArmazenamento: 'patio',
    precoBaseSP: 58.9,
    var1: 0.031,
    var2: 0.061,
    var3: 0.078,
    drift36m: 0.14,
    waveAmp: 0.032,
    defaultStore: {
      estoqueAtual: 1111,
      vendas30d: 1333,
      diasEntrega: 6,
      custoMedio: 8.09,
      variacaoDemanda: 0.25,
    },
  },
  {
    codigoSinapi: '00001379',
    insumo: 'Cimento CP II 50 kg',
    unidadeComercial: 'saco 50 kg',
    localArmazenamento: 'patio',
    precoBaseSP: 36.4,
    var1: 0.026,
    var2: 0.052,
    var3: 0.064,
    drift36m: 0.11,
    waveAmp: 0.022,
    defaultStore: {
      estoqueAtual: 350,
      vendas30d: 650,
      diasEntrega: 4,
      custoMedio: 38.9,
      variacaoDemanda: 0.25,
    },
  },
  {
    codigoSinapi: '00000370',
    insumo: 'Areia média',
    unidadeComercial: 'm³',
    localArmazenamento: 'patio',
    precoBaseSP: 138.0,
    var1: -0.024,
    var2: -0.044,
    var3: -0.052,
    drift36m: 0.07,
    waveAmp: 0.025,
    defaultStore: {
      estoqueAtual: 20,
      vendas30d: 50,
      diasEntrega: 3,
      custoMedio: 215.73,
      variacaoDemanda: 0.25,
    },
  },
  {
    codigoSinapi: '00004721',
    insumo: 'Brita 1',
    unidadeComercial: 'm³',
    localArmazenamento: 'patio',
    precoBaseSP: 144.5,
    var1: -0.021,
    var2: -0.037,
    var3: -0.046,
    drift36m: 0.06,
    waveAmp: 0.021,
    defaultStore: {
      estoqueAtual: 15,
      vendas30d: 35,
      diasEntrega: 3,
      custoMedio: 205,
      variacaoDemanda: 0.25,
    },
  },
  {
    codigoSinapi: '00000731',
    insumo: 'Bloco cerâmico 9x19x39',
    unidadeComercial: 'un',
    localArmazenamento: 'patio',
    precoBaseSP: 1390.0,
    var1: 0.019,
    var2: 0.037,
    var3: 0.048,
    drift36m: 0.12,
    waveAmp: 0.019,
    defaultStore: {
      estoqueAtual: 3000,
      vendas30d: 4000,
      diasEntrega: 7,
      custoMedio: 1.63,
      variacaoDemanda: 0.25,
    },
  },
  {
    codigoSinapi: '00001381',
    insumo: 'Argamassa AC-II 20 kg',
    unidadeComercial: 'saco 20 kg',
    localArmazenamento: 'patio',
    precoBaseSP: 24.9,
    var1: 0.018,
    var2: 0.034,
    var3: 0.045,
    drift36m: 0.10,
    waveAmp: 0.018,
    defaultStore: {
      estoqueAtual: 160,
      vendas30d: 250,
      diasEntrega: 4,
      custoMedio: 24.9,
      variacaoDemanda: 0.25,
    },
  },
  {
    codigoSinapi: '00007356',
    insumo: 'Tinta acrílica 18 L',
    unidadeComercial: 'lata 18 L',
    localArmazenamento: 'prateleira',
    precoBaseSP: 342.0,
    var1: -0.026,
    var2: -0.05,
    var3: -0.062,
    drift36m: 0.05,
    waveAmp: 0.026,
    defaultStore: {
      estoqueAtual: 35,
      vendas30d: 35,
      diasEntrega: 5,
      custoMedio: 185.9,
      variacaoDemanda: 0.25,
    },
  },
  {
    codigoSinapi: '00009869',
    insumo: 'Tubo PVC esgoto 100 mm',
    unidadeComercial: 'm',
    localArmazenamento: 'prateleira',
    precoBaseSP: 74.5,
    var1: 0.016,
    var2: 0.03,
    var3: 0.04,
    drift36m: 0.11,
    waveAmp: 0.02,
    defaultStore: {
      estoqueAtual: 300,
      vendas30d: 480,
      diasEntrega: 5,
      custoMedio: 13.3,
      variacaoDemanda: 0.25,
    },
  },
  {
    codigoSinapi: '00000984',
    insumo: 'Cabo flexível 2,5 mm²',
    unidadeComercial: 'm',
    localArmazenamento: 'prateleira',
    precoBaseSP: 189.0,
    var1: -0.003,
    var2: -0.007,
    var3: -0.008,
    drift36m: 0.09,
    waveAmp: 0.024,
    defaultStore: {
      estoqueAtual: 2500,
      vendas30d: 2500,
      diasEntrega: 5,
      custoMedio: 3.05,
      variacaoDemanda: 0.25,
    },
  },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildDefaultSinapiDataset(): SinapiMaterialRecord[] {
  const records: SinapiMaterialRecord[] = [];

  for (const ufInfo of BRAZIL_UFS) {
    for (let mIdx = 0; mIdx < MATERIAL_SEEDS.length; mIdx++) {
      const seed = MATERIAL_SEEDS[mIdx];
      const currentPrice = round2(seed.precoBaseSP * ufInfo.fator);
      const startPrice = currentPrice / (1 + seed.drift36m);

      const historico: MonthlyPoint[] = HISTORICAL_MONTHS_36.map((month, idx) => {
        const t = idx / 35; // 0 .. 1
        const trendBase = startPrice + (currentPrice - startPrice) * t;
        // Deterministic seasonal curve ending cleanly at 0 for idx=35
        const wave =
          idx === 35
            ? 0
            : Math.sin((idx + mIdx * 1.7) * 0.55) * seed.waveAmp * trendBase * (1 - t * 0.35);
        return {
          month,
          price: round2(trendBase + wave),
        };
      });

      const p1 = round2(currentPrice * (1 + seed.var1));
      const p2 = round2(currentPrice * (1 + seed.var2));
      const p3 = round2(currentPrice * (1 + seed.var3));

      const previsoes: ForecastPoint[] = [
        {
          month: FORECAST_MONTHS_3[0],
          prev: p1,
          min: round2(p1 * 0.975),
          max: round2(p1 * 1.028),
        },
        {
          month: FORECAST_MONTHS_3[1],
          prev: p2,
          min: round2(p2 * 0.962),
          max: round2(p2 * 1.042),
        },
        {
          month: FORECAST_MONTHS_3[2],
          prev: p3,
          min: round2(p3 * 0.95),
          max: round2(p3 * 1.055),
        },
      ];

      records.push({
        id: seed.codigoSinapi,
        uf: ufInfo.uf,
        codigoSinapi: seed.codigoSinapi,
        insumo: seed.insumo,
        unidadeComercial: seed.unidadeComercial,
        localArmazenamento: seed.localArmazenamento,
        historico,
        previsoes,
        varTrimestrePct: round2(seed.var3 * 100),
      });
    }
  }

  return records;
}

export function buildDefaultStoreConfigs(): Record<string, StoreInventoryConfig> {
  const map: Record<string, StoreInventoryConfig> = {};
  for (const seed of MATERIAL_SEEDS) {
    map[seed.codigoSinapi] = { ...seed.defaultStore };
  }
  return map;
}

function normalizeMaterialKey(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getInitialConfigForMaterial(
  record: Pick<SinapiMaterialRecord, 'id' | 'codigoSinapi' | 'insumo'>
): StoreInventoryConfig {
  const normalizedInsumo = normalizeMaterialKey(record.insumo);
  const seed =
    MATERIAL_SEEDS.find((s) => s.codigoSinapi === record.codigoSinapi || s.codigoSinapi === record.id) ??
    MATERIAL_SEEDS.find((s) => normalizeMaterialKey(s.insumo) === normalizedInsumo);

  if (seed) {
    return { ...seed.defaultStore };
  }

  return {
    estoqueAtual: 60,
    vendas30d: 120,
    diasEntrega: 5,
    custoMedio: 0,
    variacaoDemanda: 0.25,
  };
}

const LEGACY_INITIAL_STOCK_SALES: Record<string, { estoqueAtual: number; vendas30d: number }> = {
  '00000033': { estoqueAtual: 110, vendas30d: 600 },
  '34': { estoqueAtual: 110, vendas30d: 600 },
  '00001379': { estoqueAtual: 420, vendas30d: 1200 },
  '1379': { estoqueAtual: 420, vendas30d: 1200 },
  '00000370': { estoqueAtual: 140, vendas30d: 150 },
  '370': { estoqueAtual: 140, vendas30d: 150 },
  '00004721': { estoqueAtual: 110, vendas30d: 120 },
  '4721': { estoqueAtual: 110, vendas30d: 120 },
  '00000731': { estoqueAtual: 12, vendas30d: 18 },
  '44457': { estoqueAtual: 12, vendas30d: 18 },
  '00001381': { estoqueAtual: 120, vendas30d: 900 },
  '34353': { estoqueAtual: 120, vendas30d: 900 },
  '00007356': { estoqueAtual: 56, vendas30d: 60 },
  '35692': { estoqueAtual: 56, vendas30d: 60 },
  '00009869': { estoqueAtual: 96, vendas30d: 180 },
  '9836': { estoqueAtual: 96, vendas30d: 180 },
  '00000984': { estoqueAtual: 84, vendas30d: 90 },
  '1014': { estoqueAtual: 84, vendas30d: 90 },
};

const EXCEL_CODE_TO_INSUMO: Record<string, string> = {
  '34': 'Vergalhão CA-50 10 mm',
  '1379': 'Cimento CP II 50 kg',
  '370': 'Areia média',
  '4721': 'Brita 1',
  '44457': 'Bloco cerâmico 9x19x39',
  '34353': 'Argamassa AC-II 20 kg',
  '35692': 'Tinta acrílica 18 L',
  '9836': 'Tubo PVC esgoto 100 mm',
  '1014': 'Cabo flexível 2,5 mm²',
};

export function getSeedConfigByIdOrRecord(
  id: string,
  record?: Pick<SinapiMaterialRecord, 'id' | 'codigoSinapi' | 'insumo'>
): StoreInventoryConfig | undefined {
  if (record) {
    return getInitialConfigForMaterial(record);
  }
  const mappedInsumo = EXCEL_CODE_TO_INSUMO[id];
  const seed =
    MATERIAL_SEEDS.find((s) => s.codigoSinapi === id) ??
    (mappedInsumo
      ? MATERIAL_SEEDS.find(
          (s) => normalizeMaterialKey(s.insumo) === normalizeMaterialKey(mappedInsumo)
        )
      : undefined);
  return seed ? { ...seed.defaultStore } : undefined;
}

export function isLegacyDefaultStock(materialId: string, estoqueAtual: number): boolean {
  const legacy = LEGACY_INITIAL_STOCK_SALES[materialId];
  return estoqueAtual === 60 || (legacy !== undefined && estoqueAtual === legacy.estoqueAtual);
}

export function isLegacyDefaultSales(materialId: string, vendas30d: number): boolean {
  const legacy = LEGACY_INITIAL_STOCK_SALES[materialId];
  return vendas30d === 120 || (legacy !== undefined && vendas30d === legacy.vendas30d);
}
