import * as XLSX from "xlsx";

// GET /api/costs/template — скачать шаблон Excel
export async function GET() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const rows = [
    { "Месяц": month, "Категория": "Себестоимость", "Сумма (₽)": 500000, "Комментарий": "Закупка товара" },
    { "Месяц": month, "Категория": "Реклама WB",    "Сумма (₽)": 80000,  "Комментарий": "Автоматические кампании" },
    { "Месяц": month, "Категория": "Логистика",     "Сумма (₽)": 30000,  "Комментарий": "Хранение и доставка" },
    { "Месяц": month, "Категория": "Прочие",        "Сумма (₽)": 20000,  "Комментарий": "Упаковка, офис и т.д." },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Ширина колонок
  ws["!cols"] = [{ wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, "Расходы");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="expenses-template-${month}.xlsx"`,
    },
  });
}
