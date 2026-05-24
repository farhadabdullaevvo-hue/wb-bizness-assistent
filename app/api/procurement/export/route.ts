import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { getCachedSnapshot, getWBSnapshot } from "@/lib/wb-cache";
import { buildForecast, DEFAULT_SETTINGS } from "@/lib/forecast";

// GET /api/procurement/export — скачать Excel с заканчивающимися размерами
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadTimeDays = Math.max(1, parseInt(searchParams.get("leadTime") ?? String(DEFAULT_SETTINGS.leadTimeDays)));
  const targetDays   = Math.max(7, parseInt(searchParams.get("targetDays") ?? String(DEFAULT_SETTINGS.targetDays)));

  const snapshot = getCachedSnapshot() ?? await getWBSnapshot();
  if (!snapshot) {
    return Response.json({ error: "Нет данных WB API" }, { status: 503 });
  }

  const items = buildForecast(snapshot, { leadTimeDays, targetDays });
  const NON_SIZE = new Set(["0", "one size", "onesize", "без размера"]);

  // Лист 1: размеры с проблемами
  const sizeRows: Record<string, unknown>[] = [];
  for (const item of items) {
    const problemSizes = item.sizes.filter(s => !NON_SIZE.has(s.size.toLowerCase()) && s.qty <= 3);
    for (const s of problemSizes) {
      sizeRows.push({
        "Артикул":          item.article,
        "Название":         item.name,
        "Размер":           s.size,
        "Остаток (шт.)":    s.qty,
        "Статус размера":   s.qty === 0 ? "Нет на складе" : "Мало (≤3 шт.)",
        "Дней запаса":      item.daysLeft < 999 ? item.daysLeft : "—",
        "Заказать до":      item.orderDate || "—",
        "Рекомендуем (шт.)": item.recommendedQty || "—",
      });
    }
  }

  // Лист 2: все товары сводно
  const allRows = items
    .filter(i => i.status !== "no_sales")
    .map(item => ({
      "Артикул":           item.article,
      "Название":          item.name,
      "Остаток (шт.)":     item.totalQty,
      "Темп продаж (шт/д)": item.dailyRate > 0 ? item.dailyRate.toFixed(1) : "—",
      "Дней запаса":       item.daysLeft < 999 ? item.daysLeft : "—",
      "Кончится":          item.runOutDate || "—",
      "Заказать до":       item.orderDate || "—",
      "Рекомендуем (шт.)": item.recommendedQty || "—",
      "Статус":            item.status === "urgent" ? "Срочно!" : item.status === "soon" ? "Скоро" : "Норма",
    }));

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(
    sizeRows.length > 0 ? sizeRows : [{ "Артикул": "Нет проблемных размеров", "Название": "", "Размер": "", "Остаток (шт.)": "", "Статус размера": "", "Дней запаса": "", "Заказать до": "", "Рекомендуем (шт.)": "" }]
  );
  ws1["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Проблемные размеры");

  const ws2 = XLSX.utils.json_to_sheet(allRows);
  ws2["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Все товары");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const date = new Date().toISOString().slice(0, 10);

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="procurement-${date}.xlsx"`,
    },
  });
}
