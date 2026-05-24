import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { getSales } from "@/lib/wb-api";

const MOCK_REVENUE = 487320; // демо когда WB недоступен

async function getMonthRevenue(month: string): Promise<{ revenue: number; wbAvailable: boolean }> {
  try {
    const sales = await getSales(`${month}-01`);
    const revenue = sales
      .filter(s => s.date.startsWith(month) && s.IsStorno === 0)
      .reduce((sum, s) => sum + (s.forPay ?? 0), 0);
    return { revenue: Math.round(revenue), wbAvailable: true };
  } catch {
    return { revenue: MOCK_REVENUE, wbAvailable: false };
  }
}

// GET /api/costs?month=2026-05
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = searchParams.get("month") ?? defaultMonth;

  const [expenses, { revenue, wbAvailable }] = await Promise.all([
    db.expense.findMany({ where: { month }, orderBy: { createdAt: "asc" } }),
    getMonthRevenue(month),
  ]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const profit = revenue - totalExpenses;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }

  return Response.json({
    month,
    expenses,
    summary: {
      revenue: Math.round(revenue),
      totalExpenses: Math.round(totalExpenses),
      profit: Math.round(profit),
      margin,
      wbAvailable,
      byCategory,
    },
  });
}

// POST /api/costs — добавить расход вручную
export async function POST(req: NextRequest) {
  const { month, category, amount, note } = await req.json();
  if (!month || !category || !amount) {
    return Response.json({ error: "month, category, amount обязательны" }, { status: 400 });
  }
  const expense = await db.expense.create({
    data: { month, category, amount: Number(amount), note: note ?? null, source: "manual" },
  });
  return Response.json(expense);
}
