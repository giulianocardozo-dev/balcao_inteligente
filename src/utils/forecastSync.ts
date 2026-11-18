import { ForecastSyncState, SinapiMaterialRecord } from '../types/inventory';
import { isExcludedMaterial, parseSinapiWorkbook } from './excelHandler';

export const GITHUB_FORECAST_BLOB_URL =
  'https://github.com/giulianocardozo-dev/balcao_inteligente/blob/main/balcao%20inteligente%20181126%20projecao.xlsx';

export function toRawGitHubUrl(url: string): string {
  const blobMatch = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/
  );
  if (blobMatch) {
    const [, owner, repo, branch, filePath] = blobMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  }
  return url;
}

export const GITHUB_FORECAST_RAW_URL = toRawGitHubUrl(GITHUB_FORECAST_BLOB_URL);
export const FORECAST_SYNC_INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 horas

export const FORECAST_STORAGE_KEYS = {
  RECORDS: 'balcao_inteligente_records_v1',
  SYNC_STATE: 'balcao_inteligente_sync_state_v1',
};

export interface CachedForecastData {
  records: SinapiMaterialRecord[];
  syncState: ForecastSyncState;
}

export function formatSyncTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '--/--/---- - --:--';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

export function readCachedForecast(): CachedForecastData | null {
  try {
    const rawRecords = localStorage.getItem(FORECAST_STORAGE_KEYS.RECORDS);
    if (!rawRecords) return null;

    const parsed = JSON.parse(rawRecords) as SinapiMaterialRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const filtered = parsed.filter(
      (r) => !isExcludedMaterial(r.codigoSinapi || r.id, r.insumo)
    );
    if (filtered.length === 0) return null;

    const rawState = localStorage.getItem(FORECAST_STORAGE_KEYS.SYNC_STATE);
    let syncState: ForecastSyncState | null = null;
    if (rawState) {
      try {
        syncState = JSON.parse(rawState) as ForecastSyncState;
      } catch {
        syncState = null;
      }
    }

    const materialSet = new Set(filtered.map((r) => r.insumo));
    const ufSet = new Set(filtered.map((r) => r.uf));

    return {
      records: filtered,
      syncState: {
        source: syncState?.source === 'github' ? 'github' : 'cache',
        updatedAtIso: syncState?.updatedAtIso || new Date().toISOString(),
        lastCheckedIso: syncState?.lastCheckedIso,
        materialCount: materialSet.size,
        ufCount: ufSet.size,
      },
    };
  } catch {
    return null;
  }
}

export function saveCachedForecast(
  records: SinapiMaterialRecord[],
  syncState: ForecastSyncState
): void {
  try {
    localStorage.setItem(FORECAST_STORAGE_KEYS.RECORDS, JSON.stringify(records));
    localStorage.setItem(
      FORECAST_STORAGE_KEYS.SYNC_STATE,
      JSON.stringify(syncState)
    );
  } catch {
    // Ignore storage quota issues safely
  }
}

export type FetchForecastResult =
  | { ok: true; records: SinapiMaterialRecord[]; syncState: ForecastSyncState }
  | { ok: false; reason: 'offline' | 'http' | 'parse' | 'aborted' };

export async function fetchGitHubForecast(
  signal?: AbortSignal
): Promise<FetchForecastResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, reason: 'offline' };
  }

  try {
    const res = await fetch(GITHUB_FORECAST_RAW_URL, {
      method: 'GET',
      cache: 'no-store',
      signal,
    });

    if (!res.ok) {
      return { ok: false, reason: 'http' };
    }

    const buffer = await res.arrayBuffer();
    const parsed = parseSinapiWorkbook(buffer);
    const nowIso = new Date().toISOString();

    const syncState: ForecastSyncState = {
      source: 'github',
      updatedAtIso: nowIso,
      lastCheckedIso: nowIso,
      materialCount: parsed.materialCount,
      ufCount: parsed.ufs.length,
    };

    saveCachedForecast(parsed.records, syncState);
    return { ok: true, records: parsed.records, syncState };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, reason: 'aborted' };
    }
    return { ok: false, reason: 'http' };
  }
}
