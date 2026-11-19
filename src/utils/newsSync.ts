import { MARKET_NEWS_ITEMS, formatNewsDateLabel } from '../data/marketNews';
import { MarketNewsItem } from '../types/inventory';
import { isExcludedMaterial } from './excelHandler';

export const NEWS_SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 horas

export const NEWS_STORAGE_KEYS = {
  ITEMS: 'balcao_inteligente_news_items_v1',
  UPDATED_AT: 'balcao_inteligente_news_updated_v1',
};

export interface CachedNewsData {
  items: MarketNewsItem[];
  updatedAtIso: string;
}

function sanitizeNewsItems(items: MarketNewsItem[]): MarketNewsItem[] {
  const now = new Date();
  return items
    .filter(
      (item) =>
        item &&
        typeof item.titulo === 'string' &&
        typeof item.articleUrl === 'string' &&
        !isExcludedMaterial(item.materialId, item.materialNome) &&
        !isExcludedMaterial(item.materialId, item.titulo)
    )
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .map((item, idx) => ({
      ...item,
      ordemRecencia: idx + 1,
      dataLabel: formatNewsDateLabel(item.publishedAt, now),
    }));
}

export function readCachedNews(): CachedNewsData | null {
  try {
    const raw = localStorage.getItem(NEWS_STORAGE_KEYS.ITEMS);
    const updatedAtIso = localStorage.getItem(NEWS_STORAGE_KEYS.UPDATED_AT);
    if (!raw || !updatedAtIso) return null;

    const parsed = JSON.parse(raw) as MarketNewsItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    if (parsed.some((item) => item.id && item.id.startsWith('rss-news-'))) {
      localStorage.removeItem(NEWS_STORAGE_KEYS.ITEMS);
      localStorage.removeItem(NEWS_STORAGE_KEYS.UPDATED_AT);
      return null;
    }

    const clean = sanitizeNewsItems(parsed);
    if (clean.length === 0) return null;

    return { items: clean, updatedAtIso };
  } catch {
    return null;
  }
}

export function saveCachedNews(items: MarketNewsItem[], updatedAtIso: string): void {
  try {
    localStorage.setItem(NEWS_STORAGE_KEYS.ITEMS, JSON.stringify(items));
    localStorage.setItem(NEWS_STORAGE_KEYS.UPDATED_AT, updatedAtIso);
  } catch {
    // Ignore storage quota errors safely
  }
}

export function getInitialNewsItems(): MarketNewsItem[] {
  const cached = readCachedNews();
  if (cached) {
    return cached.items;
  }
  return sanitizeNewsItems(MARKET_NEWS_ITEMS);
}

export function shouldRefreshNews(
  updatedAtIso: string | null,
  nowMs: number = Date.now()
): boolean {
  if (!updatedAtIso) return true;
  const parsedMs = Date.parse(updatedAtIso);
  if (Number.isNaN(parsedMs)) return true;
  return nowMs - parsedMs >= NEWS_SYNC_INTERVAL_MS;
}

export type FetchNewsResult =
  | { ok: true; items: MarketNewsItem[]; updatedAtIso: string }
  | { ok: false; error: string; aborted?: boolean };

export async function fetchSmartWebNews(options?: {
  force?: boolean;
  signal?: AbortSignal;
}): Promise<FetchNewsResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      error: 'Sem conexão com a internet para atualizar as notícias.',
    };
  }

  try {
    const query = options?.force ? '?force=1' : '';
    const response = await fetch(`/api/news${query}`, {
      method: 'GET',
      cache: 'no-store',
      signal: options?.signal,
    });

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      degraded?: boolean;
      items?: MarketNewsItem[];
      updatedAtIso?: string;
      error?: string;
    } | null;

    if (!response.ok || !payload?.ok || !Array.isArray(payload.items)) {
      return {
        ok: false,
        error:
          payload?.error ||
          'Não foi possível buscar notícias atualizadas na web no momento.',
      };
    }

    if (payload.items.length === 0 && payload.degraded) {
      const existing = getInitialNewsItems();
      const cachedAt = readCachedNews()?.updatedAtIso ?? new Date().toISOString();
      return { ok: true, items: existing, updatedAtIso: cachedAt };
    }

    const clean = sanitizeNewsItems(payload.items);
    if (clean.length === 0) {
      const existing = getInitialNewsItems();
      if (existing.length > 0) {
        const cachedAt = readCachedNews()?.updatedAtIso ?? new Date().toISOString();
        return { ok: true, items: existing, updatedAtIso: cachedAt };
      }
      return {
        ok: false,
        error: 'Nenhuma notícia recente válida encontrada na busca web.',
      };
    }

    const updatedAtIso = payload.updatedAtIso || new Date().toISOString();
    saveCachedNews(clean, updatedAtIso);
    return { ok: true, items: clean, updatedAtIso };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, error: 'Requisição cancelada.', aborted: true };
    }
    return {
      ok: false,
      error: 'Falha de conexão ao buscar notícias atualizadas na web.',
    };
  }
}
