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
    // Return mock data in dev while WB API is rate-limited, so UI looks realistic
    if (process.env.NODE_ENV !== "production") {
      const mock = getMockSnapshot();
      _cache = { data: mock, ts: Date.now() };
      return mock;
    }
    return null;
  }
}

function getMockSnapshot(): WBSnapshot {
  const today = isoDate(0);
  const yesterday = isoDate(-1);
  const mkSale = (article: string, date: string, forPay: number, storno = 0): WBSale => ({
    date: `${date}T10:00:00`, supplierArticle: article, techSize: "0", barcode: "",
    totalPrice: forPay * 1.3, discountPercent: 20, isSupply: false, isRealization: false,
    saleID: `S${Math.random()}`, forPay, finishedPrice: forPay * 1.1, priceWithDisc: forPay * 1.1,
    nmId: parseInt(article), subject: article === "ART-001" ? "Куртка зимняя" : article === "ART-002" ? "Рюкзак школьный" : "Кроссовки",
    category: "Одежда", brand: "Demo", IsStorno: storno,
  });
  const mkOrder = (article: string, date: string, price: number): WBOrder => ({
    date: `${date}T11:00:00`, supplierArticle: article, techSize: "0", barcode: "",
    totalPrice: price, discountPercent: 15, warehouseName: "Москва (Коледино)",
    nmId: parseInt(article), subject: "", category: "", brand: "", isCancel: false,
    finishedPrice: price, priceWithDisc: price, srid: "",
  });
  const mkStock = (article: string, size: string, qty: number, wh = "Коледино"): WBStock => ({
    lastChangeDate: today, supplierArticle: article, techSize: size, barcode: "",
    quantity: qty, quantityFull: qty, quantityNotInOrders: qty, warehouseName: wh,
    nmId: parseInt(article) || 0, subject: article === "ART-001" ? "Куртка зимняя" : article === "ART-002" ? "Рюкзак школьный" : "Кроссовки",
    category: "Одежда", brand: "Demo", Price: 5000, Discount: 20,
  });

  return {
    sales: [
      // Today sales
      mkSale("ART-001", today, 4200), mkSale("ART-001", today, 4200), mkSale("ART-001", today, 4200),
      mkSale("ART-002", today, 2800), mkSale("ART-002", today, 2800),
      mkSale("ART-003", today, 6100), mkSale("ART-003", today, 6100), mkSale("ART-003", today, 6100), mkSale("ART-003", today, 6100),
      mkSale("ART-001", today, 4200, 1), // возврат
      // Yesterday sales
      mkSale("ART-001", yesterday, 4200), mkSale("ART-001", yesterday, 4200),
      mkSale("ART-002", yesterday, 2800), mkSale("ART-002", yesterday, 2800), mkSale("ART-002", yesterday, 2800),
      mkSale("ART-003", yesterday, 6100), mkSale("ART-003", yesterday, 6100),
    ],
    orders: [
      mkOrder("ART-001", today, 5500), mkOrder("ART-001", today, 5500), mkOrder("ART-001", today, 5500),
      mkOrder("ART-002", today, 3500), mkOrder("ART-002", today, 3500),
      mkOrder("ART-003", today, 7800), mkOrder("ART-003", today, 7800), mkOrder("ART-003", today, 7800), mkOrder("ART-003", today, 7800),
      mkOrder("ART-001", yesterday, 5500), mkOrder("ART-001", yesterday, 5500),
      mkOrder("ART-002", yesterday, 3500), mkOrder("ART-002", yesterday, 3500), mkOrder("ART-002", yesterday, 3500), mkOrder("ART-002", yesterday, 3500),
      mkOrder("ART-003", yesterday, 7800), mkOrder("ART-003", yesterday, 7800),
    ],
    stocks: [
      // ART-001: куртка с проблемами по размерам
      mkStock("ART-001", "XS", 0),   // нет!
      mkStock("ART-001", "S",  2),   // мало
      mkStock("ART-001", "M",  45),
      mkStock("ART-001", "L",  38),
      mkStock("ART-001", "XL", 0),   // нет!
      mkStock("ART-001", "XXL", 12),
      // ART-002: рюкзак — мало дней запаса
      mkStock("ART-002", "0", 18, "Коледино"),
      mkStock("ART-002", "0", 5, "Казань"),
      // ART-003: кроссовки — нормально
      mkStock("ART-003", "38", 30), mkStock("ART-003", "39", 28), mkStock("ART-003", "40", 35),
      mkStock("ART-003", "41", 22), mkStock("ART-003", "42", 18), mkStock("ART-003", "43", 5),
    ],
    fetchedAt: new Date().toISOString(),
    isMock: true,
  };
}

export function getCachedSnapshot(): WBSnapshot | null {
  if (_cache && Date.now() - _cache.ts < TTL) return _cache.data;
  return null;
}
