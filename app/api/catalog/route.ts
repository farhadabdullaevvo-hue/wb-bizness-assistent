import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// GET /api/catalog — все товары из каталога
export async function GET() {
  const products = await db.productCatalog.findMany({
    orderBy: { article: "asc" },
  });
  return Response.json(products);
}

// POST /api/catalog — массовый upsert (из Excel)
export async function POST(req: NextRequest) {
  const items = await req.json() as {
    nmId: number; article: string; subject?: string; name?: string;
    status?: string; responsible?: string;
  }[];

  let upserted = 0;
  for (const item of items) {
    await db.productCatalog.upsert({
      where: { nmId: item.nmId },
      create: {
        nmId: item.nmId,
        article: item.article,
        subject: item.subject ?? null,
        name: item.name ?? null,
        status: item.status ?? "Без статуса",
        responsible: item.responsible ?? null,
      },
      update: {
        article: item.article,
        subject: item.subject ?? null,
        name: item.name ?? null,
        status: item.status ?? "Без статуса",
        responsible: item.responsible ?? null,
      },
    });
    upserted++;
  }

  return Response.json({ upserted });
}
