import { isoDate } from "./wb-api";
import type { WBSnapshot } from "./wb-cache";

export interface ProcurementItem {
  article: string;
  name: string;
  totalQty: number;
  dailyRate: number;          // шт/день
  daysLeft: number;           // дней запаса (999 = нет продаж)
  runOutDate: string;         // ISO дата окончания запаса
  orderDate: string;          // ISO дата "не позже этого дня оформить заказ"
  recommendedQty: number;     // сколько заказать (до нужного запаса)
  status: "urgent" | "soon" | "ok" | "no_sales";
  sizes: { size: string; qty: number }[];
}

export interface ForecastSettings {
  leadTimeDays: number;   // срок поставки, дней
  targetDays: number;     // целевой запас, дней
}

export const DEFAULT_SETTINGS: ForecastSettings = {
  leadTimeDays: 14,
  targetDays: 90,
};

function addDays(base: Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + Math.round(n));
  return d.toISOString().slice(0, 10);
}

export function buildForecast(
  snapshot: WBSnapshot,
  settings: ForecastSettings = DEFAULT_SETTINGS,
): ProcurementItem[] {
  const today = isoDate(0);
  const yesterday = isoDate(-1);
  const now = new Date();

  // Продажи за 2 дня (без возвратов)
  const rateMap = new Map<string, number>();
  snapshot.sales
    .filter(s => (s.date.startsWith(today) || s.date.startsWith(yesterday)) && s.IsStorno === 0)
    .forEach(s => rateMap.set(s.supplierArticle, (rateMap.get(s.supplierArticle) ?? 0) + 1));

  // Остатки по артикулу + размеры
  const stockMap = new Map<string, { name: string; totalQty: number; sizes: Map<string, number> }>();
  for (const s of snapshot.stocks) {
    if (!stockMap.has(s.supplierArticle)) {
      stockMap.set(s.supplierArticle, { name: s.subject, totalQty: 0, sizes: new Map() });
    }
    const entry = stockMap.get(s.supplierArticle)!;
    entry.totalQty += s.quantity;
    const size = (s.techSize ?? "").trim() || "0";
    entry.sizes.set(size, (entry.sizes.get(size) ?? 0) + s.quantity);
  }

  const items: ProcurementItem[] = [];

  for (const [article, { name, totalQty, sizes }] of stockMap) {
    const salesCount = rateMap.get(article) ?? 0;
    const dailyRate = salesCount / 2;

    const sizeList = [...sizes.entries()]
      .map(([size, qty]) => ({ size, qty }))
      .sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }));

    if (dailyRate === 0) {
      items.push({
        article, name, totalQty, dailyRate: 0,
        daysLeft: 999,
        runOutDate: "",
        orderDate: "",
        recommendedQty: 0,
        status: "no_sales",
        sizes: sizeList,
      });
      continue;
    }

    const daysLeft = totalQty / dailyRate;
    const runOutDate = addDays(now, daysLeft);
    const orderDate = addDays(now, daysLeft - settings.leadTimeDays);

    // Сколько заказать чтобы получить targetDays запаса ПОСЛЕ доставки
    // (leadTimeDays дней пройдёт до поставки → расходуется leadTimeDays * dailyRate)
    const qtyAtDelivery = Math.max(0, totalQty - settings.leadTimeDays * dailyRate);
    const targetQty = settings.targetDays * dailyRate;
    const rawOrder = Math.max(0, targetQty - qtyAtDelivery);
    const recommendedQty = rawOrder > 0 ? Math.ceil(rawOrder / 10) * 10 : 0;

    // Статус: нужно заказать уже сейчас / скоро / всё хорошо
    let status: ProcurementItem["status"];
    if (daysLeft <= settings.leadTimeDays) {
      status = "urgent";
    } else if (daysLeft <= settings.leadTimeDays + 21) {
      status = "soon";
    } else {
      status = "ok";
    }

    items.push({ article, name, totalQty, dailyRate, daysLeft: Math.round(daysLeft), runOutDate, orderDate, recommendedQty, status, sizes: sizeList });
  }

  // Сортировка: urgent → soon → no_sales → ok, внутри — по daysLeft
  const ORDER = { urgent: 0, soon: 1, no_sales: 2, ok: 3 };
  return items.sort((a, b) => {
    const d = ORDER[a.status] - ORDER[b.status];
    if (d !== 0) return d;
    return a.daysLeft - b.daysLeft;
  });
}
