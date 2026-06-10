import { getSales, getOrders, getStocks, isoDate, WBRateLimitError } from "./wb-api";
import type { WBSale, WBOrder, WBStock } from "./wb-api";

export type { WBSale, WBOrder, WBStock };

export interface WBSnapshot {
  sales: WBSale[];
  orders: WBOrder[];
  stocks: WBStock[];
  fetchedAt: string;
  isMock?: boolean;
}

// globalThis переживает hot-reload в Next.js dev — модуль перезагружается, глобал остаётся
declare global {
  // eslint-disable-next-line no-var
  var _wbCache: { data: WBSnapshot; ts: number } | null | undefined;
  // eslint-disable-next-line no-var
  var _wbLastGood: WBSnapshot | null | undefined;
}
globalThis._wbCache ??= null;
globalThis._wbLastGood ??= null;

const TTL = 15 * 60 * 1000;
const DEFAULT_RETRY = 90 * 1000;

export async function getWBSnapshot(): Promise<WBSnapshot | null> {
  const cache = globalThis._wbCache;
  if (cache && Date.now() - cache.ts < TTL) return cache.data;

  try {
    const from = isoDate(-2);
    const [sales, orders, stocks] = await Promise.all([
      getSales(from),
      getOrders(from),
      getStocks(from),
    ]);
    const data: WBSnapshot = { sales, orders, stocks, fetchedAt: new Date().toISOString() };
    globalThis._wbCache = { data, ts: Date.now() };
    globalThis._wbLastGood = data;
    return data;
  } catch (err) {
    // Если WB вернул точное время ожидания — используем его, иначе 90 сек
    const retryMs = err instanceof WBRateLimitError ? err.retryAfterMs : DEFAULT_RETRY;
    const lastGood = globalThis._wbLastGood;
    const fallback = lastGood ?? { sales: [], orders: [], stocks: [], fetchedAt: new Date().toISOString() };
    globalThis._wbCache = { data: fallback, ts: Date.now() - TTL + retryMs };
    return fallback;
  }
}

export function getCachedSnapshot(): WBSnapshot | null {
  const cache = globalThis._wbCache;
  if (cache && Date.now() - cache.ts < TTL) return cache.data;
  return null;
}
