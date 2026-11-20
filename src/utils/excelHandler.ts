import * as XLSX from 'xlsx';
import { ForecastPoint, MonthlyPoint, SinapiMaterialRecord } from '../types/inventory';

export interface ParsedExcelResult {
  records: SinapiMaterialRecord[];
  ufs: string[];
  materialCount: number;
  sheetName: string;
  forecastMonths: string[];
}

export function isExcludedMaterial(codigoSinapi: string, insumo: string): boolean {
  const code = codigoSinapi.trim();
  if (code === '00000032' || code === '00000337' || code === '00034549' || code === '37592') {
    return true;
  }
  const normalized = insumo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (normalized.includes('vergalhao ca-50 8 mm') || normalized.includes('vergalhao ca-50 8mm')) {
    return true;
  }
  if (normalized.includes('arame recozido')) {
    return true;
  }
  if (normalized.includes('bloco ceramico') && normalized.includes('furos verticais')) {
    return true;
  }
  return false;
}

function parsePtNumber(val: unknown): number | null {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // Remove currency symbols, spaces, and %
  let cleaned = trimmed.replace(/[R$\s%]/g, '');

  // Handle Brazilian number format like "1.390,50" vs US "1,390.50" or "58.90"
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // 1.390,50 -> 1390.50
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,390.50 -> 1390.50
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    cleaned = cleaned.replace(',', '.');
  }

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function findHeaderKey(headers: string[], candidates: string[]): string | undefined {
  for (const c of candidates) {
    const exact = headers.find((h) => h.trim() === c);
    if (exact) return exact;
  }
  for (const c of candidates) {
    const lower = c.toLowerCase();
    const ci = headers.find((h) => h.trim().toLowerCase() === lower);
    if (ci) return ci;
  }
  return undefined;
}

export function parseSinapiWorkbook(buffer: ArrayBuffer): ParsedExcelResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array' });
  } catch {
    throw new Error('Não foi possível abrir o arquivo. Confirme se é uma planilha Excel (.xlsx ou .xls) válida.');
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('A planilha está vazia e não possui nenhuma aba.');
  }

  const preferredSheet = 'Historico_36M_e_Projecao';
  const sheetName = workbook.SheetNames.includes(preferredSheet)
    ? preferredSheet
    : workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  if (!rows || rows.length === 0) {
    throw new Error(`A aba "${sheetName}" não possui linhas de dados.`);
  }

  const headers = Object.keys(rows[0]);

  const ufKey = findHeaderKey(headers, ['UF', 'Estado']);
  const insumoKey = findHeaderKey(headers, ['Insumo', 'Material', 'Produto']);
  const codigoKey = findHeaderKey(headers, ['Codigo_SINAPI', 'Codigo', 'Cod_SINAPI']);
  const unidadeKey = findHeaderKey(headers, ['Unidade_Comercial', 'Unidade', 'UN']);
  const varTriKey = findHeaderKey(headers, ['Var_Projetada_Trimestre_%', 'Var_Trimestre_%']);

  const missing: string[] = [];
  if (!ufKey) missing.push('UF');
  if (!insumoKey) missing.push('Insumo');

  const histCols = headers
    .map((h) => {
      const m = h.trim().match(/^(\d{4})[-/](\d{2})(?:[-/]\d{2})?$/);
      return m ? { header: h, month: `${m[1]}-${m[2]}` } : null;
    })
    .filter((x): x is { header: string; month: string } => x !== null)
    .sort((a, b) => a.month.localeCompare(b.month));

  let prevCols = headers
    .map((h) => {
      const m = h.trim().match(/^(\d{4})[-/](\d{2})_Prev$/i);
      return m ? { header: h, month: `${m[1]}-${m[2]}` } : null;
    })
    .filter((x): x is { header: string; month: string } => x !== null)
    .sort((a, b) => a.month.localeCompare(b.month));

  if (prevCols.length === 0) {
    const altPrev = findHeaderKey(headers, [
      'Prev_45d',
      '45d_Prev',
      'Projecao_45d',
      'Previsao_45d',
      'Previsao',
    ]);
    if (altPrev) {
      prevCols = [{ header: altPrev, month: '45d' }];
    }
  }

  if (histCols.length === 0) {
    missing.push('colunas mensais históricas (ex.: 2026-10)');
  }
  if (prevCols.length === 0) {
    missing.push('colunas de previsão (ex.: 2026-11_Prev)');
  }

  if (missing.length > 0) {
    throw new Error(
      `Faltam colunas obrigatórias na aba "${sheetName}": ${missing.join(', ')}. Baixe a planilha modelo para conferir o formato.`
    );
  }

  const forecastMonthMeta = prevCols.slice(0, 3).map((pc) => {
    const minHeader = findHeaderKey(headers, [`${pc.month}_IC80_Min`]);
    const maxHeader = findHeaderKey(headers, [`${pc.month}_IC80_Max`]);
    return {
      month: pc.month,
      prevHeader: pc.header,
      minHeader,
      maxHeader,
    };
  });

  const records: SinapiMaterialRecord[] = [];
  const ufSet = new Set<string>();
  const materialSet = new Set<string>();

  for (const row of rows) {
    const ufRaw = String(row[ufKey!] ?? '').trim().toUpperCase();
    const insumoRaw = String(row[insumoKey!] ?? '').trim();
    if (!ufRaw || !insumoRaw) continue;

    const codigoRaw = codigoKey ? String(row[codigoKey] ?? '').trim() : '';
    const unidadeRaw = unidadeKey ? String(row[unidadeKey] ?? '').trim() : 'unid';
    const id = codigoRaw || insumoRaw.toLowerCase();
    if (isExcludedMaterial(codigoRaw || id, insumoRaw)) continue;

    const historico: MonthlyPoint[] = [];
    for (const hc of histCols) {
      const price = parsePtNumber(row[hc.header]);
      if (price !== null && price > 0) {
        historico.push({ month: hc.month, price });
      }
    }

    if (historico.length === 0) continue;
    const lastHistPrice = historico[historico.length - 1].price;

    const previsoes: ForecastPoint[] = [];
    for (const fm of forecastMonthMeta) {
      const prev = parsePtNumber(row[fm.prevHeader]);
      if (prev === null || prev <= 0) continue;
      const minParsed = fm.minHeader ? parsePtNumber(row[fm.minHeader]) : null;
      const maxParsed = fm.maxHeader ? parsePtNumber(row[fm.maxHeader]) : null;
      previsoes.push({
        month: fm.month,
        prev,
        min: minParsed !== null && minParsed > 0 ? minParsed : Math.round(prev * 0.97 * 100) / 100,
        max: maxParsed !== null && maxParsed > 0 ? maxParsed : Math.round(prev * 1.03 * 100) / 100,
      });
    }

    if (previsoes.length === 0) continue;
    while (previsoes.length < 3) {
      const lastPrev = previsoes[previsoes.length - 1];
      previsoes.push({ ...lastPrev });
    }

    const parsedTri = varTriKey ? parsePtNumber(row[varTriKey]) : null;
    const varTrimestrePct =
      parsedTri !== null
        ? parsedTri
        : Math.round(((previsoes[2].prev / lastHistPrice - 1) * 100) * 100) / 100;

    ufSet.add(ufRaw);
    materialSet.add(insumoRaw);

    records.push({
      id,
      uf: ufRaw,
      codigoSinapi: codigoRaw || id,
      insumo: insumoRaw,
      unidadeComercial: unidadeRaw || 'unid',
      historico,
      previsoes,
      varTrimestrePct,
    });
  }

  if (records.length === 0) {
    throw new Error('Nenhuma linha válida com preços históricos e previstos foi encontrada na planilha.');
  }

  return {
    records,
    ufs: Array.from(ufSet).sort(),
    materialCount: materialSet.size,
    sheetName,
    forecastMonths: forecastMonthMeta.map((f) => f.month),
  };
}

export function downloadTemplateWorkbook(records: SinapiMaterialRecord[]) {
  const rows = records.map((rec) => {
    const obj: Record<string, string | number> = {
      UF: rec.uf,
      Codigo_SINAPI: rec.codigoSinapi,
      Insumo: rec.insumo,
      Unidade_Comercial: rec.unidadeComercial,
    };

    for (const h of rec.historico) {
      obj[h.month] = h.price;
    }

    for (const p of rec.previsoes) {
      obj[`${p.month}_Prev`] = p.prev;
      obj[`${p.month}_IC80_Min`] = p.min;
      obj[`${p.month}_IC80_Max`] = p.max;
    }

    obj['Var_Projetada_Trimestre_%'] = rec.varTrimestrePct;
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Historico_36M_e_Projecao');
  XLSX.writeFile(workbook, 'Projecao_SINAPI_UF_Insumo_3M.xlsx');
}
