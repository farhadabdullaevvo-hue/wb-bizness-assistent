import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

// POST /api/catalog/import — загрузка Excel с артикулами
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "Файл не передан" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  let upserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const nmId = parseInt(String(row["Артикул WB"] ?? "").replace(/\s/g, ""));
    const article = String(row["Артикул"] ?? "").trim().replace(/^"|"$/g, "");
    const subject = String(row["Предмет"] ?? "").trim().replace(/^"|"$/g, "") || null;
    const name = String(row["Название"] ?? "").trim().replace(/^"|"$/g, "") || null;
    const status = String(row["Статус"] ?? "").trim() || "Без статуса";
    const responsible = String(row["Ответственный"] ?? "").trim() || null;

    if (isNaN(nmId) || nmId <= 0) {
      errors.push(`Строка ${rowNum}: неверный Артикул WB "${row["Артикул WB"]}"`);
      continue;
    }
    if (!article) {
      errors.push(`Строка ${rowNum}: пустой Артикул`);
      continue;
    }

    await db.productCatalog.upsert({
      where: { nmId },
      create: { nmId, article, subject, name, status, responsible },
      update: { article, subject, name, status, responsible },
    });
    upserted++;
  }

  return Response.json({ upserted, errors, total: rows.length });
}
