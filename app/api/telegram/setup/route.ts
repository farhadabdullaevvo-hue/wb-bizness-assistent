import { getLastChatId, sendMessage } from "@/lib/telegram";

// GET /api/telegram/setup — определяет chat_id автоматически
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return Response.json({ error: "TELEGRAM_BOT_TOKEN не задан" }, { status: 400 });
  }

  const chatId = await getLastChatId();
  if (!chatId) {
    return Response.json({
      error: "Не найдено сообщений боту. Напишите боту любое сообщение в Telegram и повторите.",
    }, { status: 404 });
  }

  // Проверяем что можем отправить сообщение
  const ok = await sendMessage(
    "✅ <b>WB Ассистент подключён!</b>\n\nТеперь сюда будут приходить:\n• 🌅 Утренняя сводка по магазину\n• 🔴 Критичные алерты (нет товаров, нет размеров)\n• 🟡 Предупреждения о запасах",
    chatId
  );

  return Response.json({ ok, chatId });
}
