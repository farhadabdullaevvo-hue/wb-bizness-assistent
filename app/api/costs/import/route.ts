import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

// POST /api/costs/import — загрузка Excel файла
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "Файл не передан" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const VALID_CATEGORIES = ["Себестоимость", "Реклама WB", "Логистика", "Прочие"];
  const created: { month: string; category: string; amount: number }[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const month = String(row["Месяц"] ?? "").trim();
    const category = String(row["Категория"] ?? "").trim();
    const rawAmount = row["Сумма (₽)"] ?? row["Сумма"] ?? "";
    const amount = parseFloat(String(rawAmount).replace(/\s/g, "").replace(",", "."));
    const note = String(row["Комментарий"] ?? "").trim() || null;

    if (!month.match(/^\d{4}-\d{2}$/)) {
      errors.push(`Строка ${rowNum}: неверный формат месяца "${month}" (нужно ГГГГ-ММ)`);
      continue;
    }
    if (!VALID_CATEGORIES.includes(category)) {
      errors.push(`Строка ${rowNum}: неизвестная категория "${category}"`);
      continue;
    }
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Строка ${rowNum}: неверная сумма "${rawAmount}"`);
      continue;
    }

    await db.expense.create({ data: { month, category, amount, note, source: "excel" } });
    created.push({ month, category, amount });
  }

  return Response.json({ imported: created.length, errors, total: rows.length });
}
