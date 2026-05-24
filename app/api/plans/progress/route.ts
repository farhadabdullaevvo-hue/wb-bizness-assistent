import { db } from "@/lib/db";
import { getSales } from "@/lib/wb-api";
import { NextRequest } from "next/server";

export interface PlanProgress {
  plan: { id: string; month: string; targetRevenue: number; note: string | null } | null;
  month: string;
  // Дни
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  // Выручка
  actualRevenue: number;
  targetRevenue: number;
  remainingRevenue: number;
  // Темп
  requiredDailyPace: number;   // нужно в день с начала месяца
  actualDailyPace: number;     // факт в день
  requiredRemainingPace: number; // нужно в день чтобы закрыть оставшееся
  // Статус
  completionPct: number;
  status: "ahead" | "on_track" | "behind" | "critical";
  deviation: number; // % отклонение от плана (отрицательное = отстаём)
  wbAvailable: boolean;
}

// Кеш месячных данных WB — отдельно от 2-дневного кеша
let _monthlyCache: { data: { revenue: number; month: string }; ts: number } | null = null;
const MONTHLY_TTL = 30 * 60 * 1000; // 30 минут

async function getMonthlyRevenue(month: string): Promise<{ revenue: number; available: boolean }> {
  if (_monthlyCache && _monthlyCache.data.month === month && Date.now() - _monthlyCache.ts < MONTHLY_TTL) {
    return { revenue: _monthlyCache.data.revenue, available: true };
  }

  try {
    const dateFrom = `${month}-01`;
    const sales = await getSales(dateFrom);
    const revenue = sales
      .filter(s => s.date.startsWith(month) && s.IsStorno === 0)
      .reduce((sum, s) => sum + (s.forPay ?? 0), 0);

    _monthlyCache = { data: { revenue, month }, ts: Date.now() };
    return { revenue: Math.round(revenue), available: true };
  } catch {
    // Fallback to mock in dev
    if (process.env.NODE_ENV !== "production") {
      const mockRevenue = 487320; // моковая выручка для демо
      return { revenue: mockRevenue, available: false };
    }
    return { revenue: 0, available: false };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = searchParams.get("month") ?? defaultMonth;

  // Достаём план из БД
  const plan = await db.salesPlan.findUnique({ where: { month } });
  const targetRevenue = plan?.targetRevenue ?? 0;

  // Считаем дни
  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const today = month === defaultMonth ? now.getDate() : daysInMonth;
  const daysElapsed = Math.max(today - 1, 1);
  const daysRemaining = Math.max(daysInMonth - today + 1, 0);

  // Выручка из WB
  const { revenue: actualRevenue, available: wbAvailable } = await getMonthlyRevenue(month);

  // Расчёты
  const requiredDailyPace = targetRevenue > 0 ? targetRevenue / daysInMonth : 0;
  const actualDailyPace = daysElapsed > 0 ? actualRevenue / daysElapsed : 0;
  const remainingRevenue = Math.max(targetRevenue - actualRevenue, 0);
  const requiredRemainingPace = daysRemaining > 0 ? remainingRevenue / daysRemaining : 0;
  const completionPct = targetRevenue > 0 ? Math.round((actualRevenue / targetRevenue) * 100) : 0;

  // Статус: сравниваем фактический дневной темп с плановым
  let deviation = 0;
  let status: PlanProgress["status"] = "on_track";
  if (targetRevenue > 0 && daysElapsed > 0) {
    const expectedByNow = requiredDailyPace * daysElapsed;
    deviation = Math.round(((actualRevenue - expectedByNow) / expectedByNow) * 100);
    if (deviation >= 10) status = "ahead";
    else if (deviation >= -15) status = "on_track";
    else if (deviation >= -30) status = "behind";
    else status = "critical";
  }

  const progress: PlanProgress = {
    plan: plan ? { id: plan.id, month: plan.month, targetRevenue: plan.targetRevenue, note: plan.note } : null,
    month,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    actualRevenue,
    targetRevenue,
    remainingRevenue,
    requiredDailyPace: Math.round(requiredDailyPace),
    actualDailyPace: Math.round(actualDailyPace),
    requiredRemainingPace: Math.round(requiredRemainingPace),
    completionPct,
    status,
    deviation,
    wbAvailable,
  };

  return Response.json(progress);
}
