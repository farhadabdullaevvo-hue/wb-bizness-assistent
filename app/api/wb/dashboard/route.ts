import { getWBSnapshot } from "@/lib/wb-cache";
import { isoDate } from "@/lib/wb-api";

export interface DashboardData {
  revenue: { today: number; yesterday: number; change: number };
  orders: { today: number; yesterday: number; change: number };
  returns: { today: number; amount: number };
  stocks: {
    total: number;
    lowStock: number;
    critical: number;
    items: { article: string; name: string; quantity: number; warehouse: string; daysLeft: number }[];
  };
  updatedAt: string;
}

export async function GET() {
  try {
    const snapshot = await getWBSnapshot();

    if (!snapshot) {
      return Response.json({ error: "WB API unavailable", rateLimited: true }, { status: 429 });
    }

    const todayStr = isoDate(0);
    const yesterdayStr = isoDate(-1);

    const { sales, orders, stocks } = snapshot;

    const todaySales    = sales.filter(s => s.date.startsWith(todayStr)     && s.IsStorno === 0);
    const yesterdaySales = sales.filter(s => s.date.startsWith(yesterdayStr) && s.IsStorno === 0);
    const todayReturns  = sales.filter(s => s.date.startsWith(todayStr)     && s.IsStorno === 1);
    const todayOrders   = orders.filter(o => o.date.startsWith(todayStr)    && !o.isCancel);
    const yesterdayOrders = orders.filter(o => o.date.startsWith(yesterdayStr) && !o.isCancel);

    const revenueToday     = todaySales.reduce((s, x) => s + (x.forPay ?? 0), 0);
    const revenueYesterday = yesterdaySales.reduce((s, x) => s + (x.forPay ?? 0), 0);
    const returnsAmount    = todayReturns.reduce((s, x) => s + (x.forPay ?? 0), 0);

    // Days-based thresholds: same as alerts.ts
    const CRITICAL_DAYS = 60, WARNING_DAYS = 90;

    // Daily sales rate per article (avg over 2 days)
    const rateMap = new Map<string, number>();
    sales
      .filter(s => (s.date.startsWith(isoDate(0)) || s.date.startsWith(isoDate(-1))) && s.IsStorno === 0)
      .forEach(s => rateMap.set(s.supplierArticle, (rateMap.get(s.supplierArticle) ?? 0) + 1));

    const lowItems = stocks
      .map(s => {
        const rate = (rateMap.get(s.supplierArticle) ?? 0) / 2;
        const days = rate > 0 ? Math.round(s.quantity / rate) : Infinity;
        return { ...s, daysLeft: days };
      })
      .filter(s => s.daysLeft <= WARNING_DAYS)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const data: DashboardData = {
      revenue: {
        today: Math.round(revenueToday),
        yesterday: Math.round(revenueYesterday),
        change: revenueYesterday > 0
          ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100)
          : 0,
      },
      orders: {
        today: todayOrders.length,
        yesterday: yesterdayOrders.length,
        change: todayOrders.length - yesterdayOrders.length,
      },
      returns: {
        today: todayReturns.length,
        amount: Math.round(Math.abs(returnsAmount)),
      },
      stocks: {
        total: stocks.length,
        lowStock: lowItems.length,
        critical: lowItems.filter(s => s.daysLeft < CRITICAL_DAYS).length,
        items: lowItems.slice(0, 5).map(s => ({
          article: s.supplierArticle,
          name: s.subject,
          quantity: s.quantity,
          warehouse: s.warehouseName,
          daysLeft: s.daysLeft,
        })),
      },
      updatedAt: snapshot.fetchedAt,
    };

    return Response.json(data);
  } catch (err) {
    console.error("WB dashboard error:", err);
    const is429 = String(err).includes("429");
    return Response.json({ error: String(err), rateLimited: is429 }, { status: is429 ? 429 : 500 });
  }
}
