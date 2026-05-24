import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Ты — AI бизнес-ассистент для продавца на маркетплейсе Wildberries.
Твоя задача — помогать собственнику бизнеса управлять магазином, анализировать ситуации и давать конкретные рекомендации.

Контекст бизнеса:
- Магазин продаёт товары на Wildberries
- У собственника есть команда сотрудников: менеджеры, закупщик, маркетолог
- Текущие показатели: выручка ~127 840 ₽/день, ~63 заказа/день
- Есть проблемы: критический остаток у нескольких товаров, одна реклама выключена

Ты помогаешь с:
- Анализом продаж и метрик WB
- Управлением рекламными кампаниями
- Планированием закупок и управлением остатками
- Работой с командой и постановкой задач
- Ценообразованием и участием в акциях WB
- SEO-оптимизацией карточек товаров
- Работой с отзывами покупателей

Правила общения:
- Всегда отвечай на русском языке
- Давай конкретные, практические рекомендации — не общие слова
- Если нужны данные которых у тебя нет — спроси пользователя
- Объясняй термины WB простыми словами если пользователь спрашивает
- Будь кратким и по делу — не лей воду`;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY не задан в .env.local" },
        { status: 500 }
      );
    }

    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("AI route error:", error);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
