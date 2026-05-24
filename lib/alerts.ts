import { db } from "./db";
import { getWBSnapshot, getCachedSnapshot } from "./wb-cache";
import { isoDate } from "./wb-api";
import type { WBSnapshot } from "./wb-cache";

export interface Alert {
  id: string;
  type: "low_stock" | "out_of_size" | "overdue_task";
  level: "critical" | "warning";
  title: string;
  message: string;
  recommendation: string;
  actionLabel: string;
  actionHref: string;
  createdAt: string;
}

// Days of stock remaining thresholds
const CRITICAL_DAYS = 60;
const WARNING_DAYS  = 90;

// Size stock thresholds (units)
const SIZE_OUT     = 0; // нет совсем → критично
const SIZE_LOW     = 3; // мало → важно

// ─── 1. Общие остатки (по дням запаса, сгруппировано по артикулу) ─────────────
function buildStockAlerts(snapshot: WBSnapshot): Alert[] {
  const today = isoDate(0);
  const yesterday = isoDate(-1);

  // Продажи: суммируем по артикулу за 2 дня
  const rateMap = new Map<string, number>();
  snapshot.sales
    .filter(s => (s.date.startsWith(today) || s.date.startsWith(yesterday)) && s.IsStorno === 0)
    .forEach(s => rateMap.set(s.supplierArticle, (rateMap.get(s.supplierArticle) ?? 0) + 1));

  // Остатки: суммируем по артикулу (все размеры + все склады)
  const stockMap = new Map<string, { name: string; totalQty: number }>();
  for (const s of snapshot.stocks) {
    const existing = stockMap.get(s.supplierArticle);
    if (existing) {
      existing.totalQty += s.quantity;
    } else {
      stockMap.set(s.supplierArticle, { name: s.subject, totalQty: s.quantity });
    }
  }

  const alerts: Alert[] = [];

  for (const [article, { name, totalQty }] of stockMap) {
    const dailyRate = (rateMap.get(article) ?? 0) / 2;
    if (dailyRate === 0) continue;

    const daysLeft = Math.round(totalQty / dailyRate);
    if (daysLeft > WARNING_DAYS) continue;

    const critical = daysLeft < CRITICAL_DAYS;
    alerts.push({
      id: `stock-${article}`,
      type: "low_stock",
      level: critical ? "critical" : "warning",
      title: critical ? "Критический остаток" : "Запас заканчивается",
      message: `«${name}» (${article}) — ${totalQty} шт. всего, темп ${dailyRate.toFixed(1)} шт/день. Запас: ~${daysLeft} дн.`,
      recommendation: critical
        ? `Срочно оформите закупку! Запас закончится менее чем через ${CRITICAL_DAYS} дней.`
        : `Запланируйте закупку — запас на ${daysLeft} дней (порог ${WARNING_DAYS} дн.).`,
      actionLabel: "К товарам",
      actionHref: "/products",
      createdAt: new Date().toISOString(),
    });
  }

  return alerts;
}

// ─── 2. Остатки по размерам ───────────────────────────────────────────────────
function buildSizeAlerts(snapshot: WBSnapshot): Alert[] {
  const NON_SIZE = new Set(["0", "one size", "onesize", "без размера"]);

  // Суммируем остатки по артикулу + размер (по всем складам)
  type SizeEntry = { name: string; qty: number };
  const byArticle = new Map<string, { name: string; sizes: Map<string, SizeEntry> }>();

  for (const s of snapshot.stocks) {
    const size = (s.techSize ?? "").trim();
    if (!size || NON_SIZE.has(size.toLowerCase())) continue;

    if (!byArticle.has(s.supplierArticle)) {
      byArticle.set(s.supplierArticle, { name: s.subject, sizes: new Map() });
    }
    const art = byArticle.get(s.supplierArticle)!;
    const existing = art.sizes.get(size);
    if (existing) {
      existing.qty += s.quantity;
    } else {
      art.sizes.set(size, { name: s.subject, qty: s.quantity });
    }
  }

  const alerts: Alert[] = [];

  for (const [article, { name, sizes }] of byArticle) {
    const outSizes: string[] = [];
    const lowSizes: { size: string; qty: number }[] = [];

    for (const [size, { qty }] of sizes) {
      if (qty <= SIZE_OUT) outSizes.push(size);
      else if (qty <= SIZE_LOW) lowSizes.push({ size, qty });
    }

    if (outSizes.length === 0 && lowSizes.length === 0) continue;

    const hasOut = outSizes.length > 0;
    const parts: string[] = [];
    if (outSizes.length > 0) parts.push(`нет: ${outSizes.join(", ")}`);
    if (lowSizes.length > 0) {
      parts.push(`мало: ${lowSizes.map(s => `${s.size} (${s.qty} шт.)`).join(", ")}`);
    }

    alerts.push({
      id: `size-${article}`,
      type: "out_of_size",
      level: hasOut ? "critical" : "warning",
      title: hasOut ? "Нет размеров" : "Заканчиваются размеры",
      message: `«${name}» (${article}) — ${parts.join("; ")}.`,
      recommendation: hasOut
        ? `Срочно закажите: размеры ${outSizes.join(", ")} — недоступны для покупателей!`
        : `Рекомендуем докупить размеры с остатком ≤ ${SIZE_LOW} шт.: ${lowSizes.map(s => s.size).join(", ")}.`,
      actionLabel: "К товарам",
      actionHref: "/products",
      createdAt: new Date().toISOString(),
    });
  }

  return alerts;
}

// ─── 3. Просроченные задачи ───────────────────────────────────────────────────
async function buildTaskAlerts(): Promise<Alert[]> {
  const now = new Date();
  const overdue = await db.task.findMany({
    where: { status: { notIn: ["done"] }, deadline: { not: null, lt: now } },
    orderBy: { deadline: "asc" },
    take: 10,
  });

  return overdue.map(task => {
    const days = Math.ceil((now.getTime() - new Date(task.deadline!).getTime()) / 86400000);
    return {
      id: `task-${task.id}`,
      type: "overdue_task" as const,
      level: days >= 3 ? "critical" : "warning",
      title: "Задача просрочена",
      message: `«${task.title}» — просрочена на ${days} дн. Исполнитель: ${task.assignee}.`,
      recommendation: `Свяжитесь с ${task.assignee} или переназначьте задачу.`,
      actionLabel: "К задачам",
      actionHref: "/tasks",
      createdAt: new Date().toISOString(),
    };
  });
}

// ─── Итоговая функция ─────────────────────────────────────────────────────────
export async function generateAlerts(forceWBFetch = false): Promise<Alert[]> {
  const [snapshot, taskList] = await Promise.all([
    forceWBFetch ? getWBSnapshot() : getCachedSnapshot(),
    buildTaskAlerts(),
  ]);

  const stockList = snapshot ? buildStockAlerts(snapshot) : [];
  const sizeList  = snapshot ? buildSizeAlerts(snapshot)  : [];

  return [...stockList, ...sizeList, ...taskList].sort((a, b) =>
    a.level === b.level ? 0 : a.level === "critical" ? -1 : 1
  );
}
