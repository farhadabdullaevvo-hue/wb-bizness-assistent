import { getWBSnapshot } from "@/lib/wb-cache";
import { isoDate } from "@/lib/wb-api";

export interface ProductSize {
  size: string;
  quantity: number;
  status: "out" | "low" | "ok";
}

export interface ProductWarehouse {
  name: string;
  qty: number;
}

export interface Product {
  nmId: number;
  article: string;
  name: string;
  category: string;
  brand: string;
  hasSizes: boolean;
  totalQty: number;
  daysLeft: number | null;
  sizes: ProductSize[];
  status: "critical" | "warning" | "ok";
  ordersToday: number;
  ordersYesterday: number;
  revenueToday: number;
  revenueYesterday: number;
  returns: number;
  warehouses: ProductWarehouse[];
}

const NON_SIZE = new Set(["0", "one size", "onesize", "без размера"]);
const SIZE_LOW  = 3;   // ≤ 3 шт. на размер → warning
const CRITICAL_DAYS = 60;
const WARNING_DAYS  = 90;

export async function GET() {
  const snapshot = await getWBSnapshot();

  if (!snapshot) {
    return Response.json({ products: [], rateLimited: true }, { status: 429 });
  }

  const today = isoDate(0);
  const yesterday = isoDate(-1);

  // Sales rate per article (avg 2 days) — for daysLeft
  const rateMap = new Map<string, number>();
  snapshot.sales
    .filter(s => (s.date.startsWith(today) || s.date.startsWith(yesterday)) && s.IsStorno === 0)
    .forEach(s => rateMap.set(s.supplierArticle, (rateMap.get(s.supplierArticle) ?? 0) + 1));

  // Orders today / yesterday per article
  const ordersTodayMap = new Map<string, number>();
  const ordersYesterdayMap = new Map<string, number>();
  const revenueTodayMap = new Map<string, number>();
  const revenueYesterdayMap = new Map<string, number>();
  for (const o of snapshot.orders) {
    if (o.isCancel) continue;
    const price = o.finishedPrice ?? 0;
    if (o.date.startsWith(today)) {
      ordersTodayMap.set(o.supplierArticle, (ordersTodayMap.get(o.supplierArticle) ?? 0) + 1);
      revenueTodayMap.set(o.supplierArticle, (revenueTodayMap.get(o.supplierArticle) ?? 0) + price);
    } else if (o.date.startsWith(yesterday)) {
      ordersYesterdayMap.set(o.supplierArticle, (ordersYesterdayMap.get(o.supplierArticle) ?? 0) + 1);
      revenueYesterdayMap.set(o.supplierArticle, (revenueYesterdayMap.get(o.supplierArticle) ?? 0) + price);
    }
  }

  // Returns (storno) today
  const returnsMap = new Map<string, number>();
  for (const s of snapshot.sales) {
    if (s.IsStorno === 1 && s.date.startsWith(today)) {
      returnsMap.set(s.supplierArticle, (returnsMap.get(s.supplierArticle) ?? 0) + 1);
    }
  }

  // Warehouse breakdown
  const warehouseMap = new Map<string, Map<string, number>>();
  for (const s of snapshot.stocks) {
    if (!warehouseMap.has(s.supplierArticle)) warehouseMap.set(s.supplierArticle, new Map());
    const wh = warehouseMap.get(s.supplierArticle)!;
    wh.set(s.warehouseName, (wh.get(s.warehouseName) ?? 0) + s.quantity);
  }

  // Group stocks by article
  type RawProduct = {
    nmId: number;
    name: string;
    category: string;
    brand: string;
    sizeMap: Map<string, number>; // size → total qty
    totalQty: number;
  };
  const artMap = new Map<string, RawProduct>();

  for (const s of snapshot.stocks) {
    if (!artMap.has(s.supplierArticle)) {
      artMap.set(s.supplierArticle, {
        nmId: s.nmId,
        name: s.subject,
        category: s.category,
        brand: s.brand,
        sizeMap: new Map(),
        totalQty: 0,
      });
    }
    const p = artMap.get(s.supplierArticle)!;
    const size = (s.techSize ?? "").trim();
    p.totalQty += s.quantity;
    p.sizeMap.set(size, (p.sizeMap.get(size) ?? 0) + s.quantity);
  }

  const products: Product[] = [];

  for (const [article, raw] of artMap) {
    const dailyRate = (rateMap.get(article) ?? 0) / 2;
    const daysLeft = dailyRate > 0 ? Math.round(raw.totalQty / dailyRate) : null;

    // Check if article actually has real sizes
    const realSizes = [...raw.sizeMap.entries()].filter(
      ([sz]) => sz && !NON_SIZE.has(sz.toLowerCase())
    );
    const hasSizes = realSizes.length > 0;

    const sizes: ProductSize[] = (hasSizes ? realSizes : [...raw.sizeMap.entries()])
      .map(([size, qty]) => ({
        size: size || "—",
        quantity: qty,
        status: (qty <= 0 ? "out" : qty <= SIZE_LOW ? "low" : "ok") as ProductSize["status"],
      }))
      .sort((a, b) => a.size.localeCompare(b.size, "ru", { numeric: true }));

    const hasOutSize = hasSizes && sizes.some(s => s.status === "out");
    const hasLowSize = hasSizes && sizes.some(s => s.status === "low");

    let status: Product["status"] = "ok";
    if (hasOutSize || (daysLeft !== null && daysLeft < CRITICAL_DAYS)) {
      status = "critical";
    } else if (hasLowSize || (daysLeft !== null && daysLeft < WARNING_DAYS)) {
      status = "warning";
    }

    const wh = warehouseMap.get(article);
    const warehouses: ProductWarehouse[] = wh
      ? [...wh.entries()]
          .map(([name, qty]) => ({ name, qty }))
          .filter(w => w.qty > 0)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5)
      : [];

    products.push({
      nmId: raw.nmId,
      article,
      name: raw.name,
      category: raw.category,
      brand: raw.brand,
      hasSizes,
      totalQty: raw.totalQty,
      daysLeft,
      sizes,
      status,
      ordersToday: ordersTodayMap.get(article) ?? 0,
      ordersYesterday: ordersYesterdayMap.get(article) ?? 0,
      revenueToday: Math.round(revenueTodayMap.get(article) ?? 0),
      revenueYesterday: Math.round(revenueYesterdayMap.get(article) ?? 0),
      returns: returnsMap.get(article) ?? 0,
      warehouses,
    });
  }

  // Sort: critical → warning → ok, then by daysLeft asc
  products.sort((a, b) => {
    const order = { critical: 0, warning: 1, ok: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    const da = a.daysLeft ?? 9999;
    const db = b.daysLeft ?? 9999;
    return da - db;
  });

  return Response.json({ products, updatedAt: snapshot.fetchedAt });
}
