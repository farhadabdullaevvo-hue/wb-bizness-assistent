import { getSales, getOrders, getStocks, isoDate } from "./wb-api";
import type { WBSale, WBOrder, WBStock } from "./wb-api";

export type { WBSale, WBOrder, WBStock };

export interface WBSnapshot {
  sales: WBSale[];
  orders: WBOrder[];
  stocks: WBStock[];
  fetchedAt: string;
  isMock?: boolean;
}

// Shared 15-min cache — used by both /api/wb/dashboard and /api/alerts
let _cache: { data: WBSnapshot; ts: number } | null = null;
const TTL = 15 * 60 * 1000;

export async function getWBSnapshot(): Promise<WBSnapshot | null> {
  if (_cache && Date.now() - _cache.ts < TTL) return _cache.data;

  try {
    const from = isoDate(-2);
    const [sales, orders, stocks] = await Promise.all([
      getSales(from),
      getOrders(from),
      getStocks(from),
    ]);
    const data: WBSnapshot = { sales, orders, stocks, fetchedAt: new Date().toISOString() };
    _cache = { data, ts: Date.now() };
    return data;
  } catch {
    // WB API unavailable — return empty snapshot, retry in 1 min instead of full 15-min TTL
    const empty: WBSnapshot = { sales: [], orders: [], stocks: [], fetchedAt: new Date().toISOString() };
    _cache = { data: empty, ts: Date.now() - TTL + 60_000 };
    return empty;
  }
}

export function getCachedSnapshot(): WBSnapshot | null {
  if (_cache && Date.now() - _cache.ts < TTL) return _cache.data;
  return null;
}
