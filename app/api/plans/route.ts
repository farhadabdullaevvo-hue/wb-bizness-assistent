import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// GET /api/plans — все планы
export async function GET() {
  const plans = await db.salesPlan.findMany({ orderBy: { month: "desc" } });
  return Response.json(plans);
}

// POST /api/plans — создать или обновить план на месяц
export async function POST(req: NextRequest) {
  const { month, targetRevenue, note } = await req.json();
  if (!month || !targetRevenue) {
    return Response.json({ error: "month и targetRevenue обязательны" }, { status: 400 });
  }

  const plan = await db.salesPlan.upsert({
    where: { month },
    update: { targetRevenue: Number(targetRevenue), note: note ?? null },
    create: { month, targetRevenue: Number(targetRevenue), note: note ?? null },
  });

  return Response.json(plan);
}
