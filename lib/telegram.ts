const TG_BASE = "https://api.telegram.org/bot";

function botToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN ?? "";
}

function chatId(): string {
  return process.env.TELEGRAM_CHAT_ID ?? "";
}

export async function sendMessage(text: string, chatIdOverride?: string): Promise<boolean> {
  const token = botToken();
  const chat = chatIdOverride ?? chatId();
  if (!token || !chat) return false;

  const res = await fetch(`${TG_BASE}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chat,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  return res.ok;
}

// Узнать chat_id по последнему сообщению боту
export async function getLastChatId(): Promise<string | null> {
  const token = botToken();
  if (!token) return null;

  const res = await fetch(`${TG_BASE}${token}/getUpdates?limit=1&offset=-1`);
  if (!res.ok) return null;
  const data = await res.json();
  const msg = data?.result?.[0]?.message;
  return msg?.chat?.id?.toString() ?? null;
}

// Форматируем сводку для Telegram
export function formatMorningSummary(params: {
  revenueToday: number;
  revenueYesterday: number;
  ordersToday: number;
  ordersYesterday: number;
  criticalAlerts: number;
  warningAlerts: number;
  lowStockItems: string[];
  missingStockItems: string[];
}): string {
  const { revenueToday, revenueYesterday, ordersToday, ordersYesterday,
    criticalAlerts, warningAlerts, lowStockItems, missingStockItems } = params;

  const date = new Date().toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
  });

  const revChange = revenueYesterday > 0
    ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100)
    : 0;
  const revSign = revChange >= 0 ? "📈" : "📉";
  const ordChange = ordersToday - ordersYesterday;

  const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";

  let text = `<b>🌅 Утренняя сводка</b>\n`;
  text += `${date}\n\n`;

  text += `<b>💰 Выручка:</b> ${fmt(revenueToday)} ${revSign}\n`;
  if (revenueYesterday > 0) text += `  вчера: ${fmt(revenueYesterday)} (${revChange >= 0 ? "+" : ""}${revChange}%)\n`;

  text += `\n<b>🛒 Заказы:</b> ${ordersToday} шт.`;
  if (ordChange !== 0) text += ` (${ordChange >= 0 ? "+" : ""}${ordChange} к вчера)`;
  text += "\n";

  if (criticalAlerts > 0 || warningAlerts > 0) {
    text += `\n<b>⚠️ Алерты:</b>\n`;
    if (criticalAlerts > 0) text += `  🔴 Критичных: ${criticalAlerts}\n`;
    if (warningAlerts > 0) text += `  🟡 Важных: ${warningAlerts}\n`;
  }

  if (missingStockItems.length > 0) {
    text += `\n<b>❌ Нет размеров:</b>\n`;
    missingStockItems.slice(0, 3).forEach(s => text += `  • ${s}\n`);
    if (missingStockItems.length > 3) text += `  ...и ещё ${missingStockItems.length - 3}\n`;
  }

  if (lowStockItems.length > 0) {
    text += `\n<b>⏳ Заканчиваются:</b>\n`;
    lowStockItems.slice(0, 3).forEach(s => text += `  • ${s}\n`);
    if (lowStockItems.length > 3) text += `  ...и ещё ${lowStockItems.length - 3}\n`;
  }

  if (criticalAlerts === 0 && warningAlerts === 0) {
    text += `\n✅ <i>Всё в порядке, нет активных алертов</i>\n`;
  }

  text += `\n<i>Открыть дашборд: /dashboard</i>`;
  return text;
}

export function formatAlertMessage(alert: {
  level: string; title: string; message: string; recommendation: string;
}): string {
  const icon = alert.level === "critical" ? "🔴" : "🟡";
  return `${icon} <b>${alert.title}</b>\n\n${alert.message}\n\n💡 ${alert.recommendation}`;
}
