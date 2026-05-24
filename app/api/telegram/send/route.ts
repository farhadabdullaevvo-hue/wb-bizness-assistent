import { generateAlerts } from "@/lib/alerts";
import { getCachedSnapshot, getWBSnapshot } from "@/lib/wb-cache";
import { isoDate } from "@/lib/wb-api";
import { sendMessage, formatAlertMessage, formatMorningSummary } from "@/lib/telegram";

// POST /api/telegram/send?type=alerts|morning
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "alerts";

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token) {
    return Response.json({ error: "TELEGRAM_BOT_TOKEN не задан в .env.local" }, { status: 400 });
  }
  if (!chatId) {
    return Response.json({ error: "TELEGRAM_CHAT_ID не задан в .env.local" }, { status: 400 });
  }

  try {
    if (type === "morning") {
      // Утренняя сводка
      const snapshot = getCachedSnapshot() ?? await getWBSnapshot();
      const alerts = await generateAlerts();

      const today = isoDate(0);
      const yesterday = isoDate(-1);

      let revenueToday = 0, revenueYesterday = 0, ordersToday = 0, ordersYesterday = 0;

      if (snapshot) {
        snapshot.sales.filter(s => s.date.startsWith(today) && s.IsStorno === 0)
          .forEach(s => { revenueToday += s.forPay; });
        snapshot.sales.filter(s => s.date.startsWith(yesterday) && s.IsStorno === 0)
          .forEach(s => { revenueYesterday += s.forPay; });
        snapshot.orders.filter(o => o.date.startsWith(today) && !o.isCancel)
          .forEach(() => ordersToday++);
        snapshot.orders.filter(o => o.date.startsWith(yesterday) && !o.isCancel)
          .forEach(() => ordersYesterday++);
      }

      const criticalAlerts = alerts.filter(a => a.level === "critical");
      const warningAlerts = alerts.filter(a => a.level === "warning");

      const missingStockItems = alerts
        .filter(a => a.type === "out_of_size")
        .map(a => a.message.split(" — ")[0].replace("«", "").replace("»", ""));

      const lowStockItems = alerts
        .filter(a => a.type === "low_stock")
        .map(a => a.message.split(" — ")[0].replace("«", "").replace("»", ""));

      const text = formatMorningSummary({
        revenueToday: Math.round(revenueToday),
        revenueYesterday: Math.round(revenueYesterday),
        ordersToday,
        ordersYesterday,
        criticalAlerts: criticalAlerts.length,
        warningAlerts: warningAlerts.length,
        lowStockItems,
        missingStockItems,
      });

      const ok = await sendMessage(text);
      return Response.json({ ok, type: "morning" });
    }

    // type === "alerts" — отправить только критичные алерты
    const alerts = await generateAlerts();
    const critical = alerts.filter(a => a.level === "critical");

    if (critical.length === 0) {
      return Response.json({ ok: true, sent: 0, message: "Нет критичных алертов" });
    }

    let sent = 0;
    for (const alert of critical.slice(0, 5)) {
      const ok = await sendMessage(formatAlertMessage(alert));
      if (ok) sent++;
    }

    return Response.json({ ok: true, sent, total: critical.length });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
