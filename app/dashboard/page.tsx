"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
} from "lucide-react";
import type { DashboardData } from "@/app/api/wb/dashboard/route";
import type { Alert } from "@/lib/alerts";

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: string;
  deadline: string | null;
}

function fmt(n: number): string {
  return n.toLocaleString("ru-RU") + " ₽";
}

function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    done:     { label: "Выполнено",  bg: "#dcfce7", color: "#16a34a" },
    progress: { label: "В работе",   bg: "#dbeafe", color: "#2563eb" },
    todo:     { label: "Не начата",  bg: "#f1f5f9", color: "#64748b" },
    overdue:  { label: "Просрочена", bg: "#fee2e2", color: "#dc2626" },
  };
  const s = map[status] ?? map.todo;
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function DashboardPage() {
  const [wb, setWb] = useState<DashboardData | null>(null);
  const [wbError, setWbError] = useState<"rate_limit" | "error" | null>(null);
  const [wbLoading, setWbLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [retryIn, setRetryIn] = useState(0);

  const today = new Date().toLocaleDateString("ru-RU", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const fetchWB = useCallback(async (bust = false) => {
    setWbError(null);
    setRetryIn(0);
    try {
      const url = bust ? `/api/wb/dashboard?t=${Date.now()}` : "/api/wb/dashboard";
      const res = await fetch(url);
      const data = await res.json();
      if (res.status === 429 || data?.rateLimited) {
        setWbError("rate_limit");
        setRetryIn(65);
        const iv = setInterval(() => setRetryIn(p => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; }), 1000);
        setTimeout(() => fetchWB(true), 65000);
        return;
      }
      if (!res.ok || "error" in data) throw new Error();
      setWb(data);
    } catch {
      setWbError("error");
    }
  }, []);

  const fetchAlerts = useCallback(async (refresh = false) => {
    try {
      const url = refresh ? "/api/alerts?refresh=1" : "/api/alerts";
      const res = await fetch(url);
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchWB().finally(() => setWbLoading(false)),
      fetchAlerts(),
      fetch("/api/tasks").then(r => r.json()).then(setTasks).catch(() => {}),
    ]);
  }, [fetchWB, fetchAlerts]);

  async function handleRefresh() {
    setRefreshing(true);
    setWbLoading(true);
    setAlertsLoading(true);
    await Promise.all([
      fetchWB(true).finally(() => setWbLoading(false)),
      fetchAlerts(true),
    ]);
    setRefreshing(false);
  }

  const updatedLabel = wb
    ? `Обновлено ${new Date(wb.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
    : wbError === "rate_limit"
    ? `Авто-повтор через ${retryIn} сек.`
    : "Загрузка...";

  const recentTasks = tasks.slice(0, 4);

  const metrics = [
    {
      title: "Выручка сегодня",
      value: wb ? fmt(wb.revenue.today) : "—",
      change: wb ? `${wb.revenue.change >= 0 ? "+" : ""}${wb.revenue.change}%` : "",
      changeLabel: wb ? `вчера ${fmt(wb.revenue.yesterday)}` : "загрузка...",
      positive: (wb?.revenue.change ?? 0) >= 0,
      icon: TrendingUp,
      iconBg: "#dcfce7",
      iconColor: "#16a34a",
    },
    {
      title: "Заказов сегодня",
      value: wb ? String(wb.orders.today) : "—",
      change: wb ? `${wb.orders.change >= 0 ? "+" : ""}${wb.orders.change}` : "",
      changeLabel: wb ? `вчера ${wb.orders.yesterday}` : "загрузка...",
      positive: (wb?.orders.change ?? 0) >= 0,
      icon: ShoppingCart,
      iconBg: "#dbeafe",
      iconColor: "#2563eb",
    },
    {
      title: "Критичные остатки",
      value: wb ? (wb.stocks.critical > 0 ? `${wb.stocks.critical} поз.` : "В порядке") : "—",
      change: wb ? (wb.stocks.lowStock > 0 ? `${wb.stocks.lowStock} <90 дней` : "Всё хорошо") : "",
      changeLabel: wb ? `из ${wb.stocks.total} позиций` : "загрузка...",
      positive: (wb?.stocks.critical ?? 1) === 0,
      icon: AlertTriangle,
      iconBg: "#fee2e2",
      iconColor: "#dc2626",
    },
    {
      title: "Возвраты сегодня",
      value: wb ? String(wb.returns.today) : "—",
      change: wb ? (wb.returns.today === 0 ? "Возвратов нет" : `−${fmt(wb.returns.amount)}`) : "",
      changeLabel: wb ? "штук / сумма" : "загрузка...",
      positive: (wb?.returns.today ?? 0) === 0,
      icon: TrendingDown,
      iconBg: "#fef3c7",
      iconColor: "#d97706",
    },
  ];

  return (
    <div className="p-8" style={{ maxWidth: 1200 }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Дашборд</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            {today} · {updatedLabel}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ backgroundColor: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
          {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
          Обновить
        </button>
      </div>

      {/* WB Error banners */}
      {wbError === "rate_limit" && !wbLoading && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-3"
          style={{ backgroundColor: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
          <Clock size={15} className="shrink-0" />
          <span>
            WB API разрешает 1 запрос в минуту.{" "}
            {retryIn > 0 ? `Авто-повтор через ${retryIn} сек.` : "Повторяем..."}
          </span>
          <button onClick={handleRefresh} disabled={refreshing || retryIn > 0}
            className="ml-auto text-xs font-medium px-3 py-1.5 rounded-lg shrink-0"
            style={{ backgroundColor: "#fbbf24", color: "white" }}>
            Повторить
          </button>
        </div>
      )}
      {wbError === "error" && !wbLoading && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
          style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }}>
          <AlertTriangle size={15} />
          Ошибка WB API. Проверьте токен WB_API_TOKEN в .env.local
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.title}
              className="bg-white rounded-xl p-5 shadow-sm"
              style={{ border: "1px solid #e2e8f0" }}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium" style={{ color: "#64748b" }}>{m.title}</p>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: m.iconBg }}>
                  <Icon size={18} color={m.iconColor} />
                </div>
              </div>
              {wbLoading ? (
                <div className="space-y-2">
                  <div className="h-7 rounded-lg animate-pulse" style={{ backgroundColor: "#f1f5f9", width: "70%" }} />
                  <div className="h-4 rounded animate-pulse" style={{ backgroundColor: "#f1f5f9", width: "90%" }} />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold mb-1" style={{ color: "#0f172a" }}>{m.value}</p>
                  <p className="text-xs" style={{ color: m.positive ? "#16a34a" : "#dc2626" }}>
                    {m.change}{" "}
                    <span style={{ color: "#94a3b8" }}>{m.changeLabel}</span>
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Main grid: Alerts + Tasks */}
      <div className="grid grid-cols-3 gap-6">

        {/* Alerts (2/3 width) */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: "#0f172a" }}>Алерты</h2>
            {alerts.length > 0 && (
              <span className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ backgroundColor: "#ede9fe", color: "#7c3aed" }}>
                {alerts.length} {alerts.length === 1 ? "алерт" : alerts.length < 5 ? "алерта" : "алертов"}
              </span>
            )}
          </div>

          {alertsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl p-5 animate-pulse"
                  style={{ border: "1px solid #e2e8f0" }}>
                  <div className="h-4 rounded mb-3" style={{ backgroundColor: "#f1f5f9", width: "40%" }} />
                  <div className="h-3 rounded mb-2" style={{ backgroundColor: "#f1f5f9", width: "100%" }} />
                  <div className="h-3 rounded" style={{ backgroundColor: "#f1f5f9", width: "70%" }} />
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center"
              style={{ border: "1px solid #e2e8f0" }}>
              <CheckCircle2 size={36} color="#86efac" className="mx-auto mb-3" />
              <p className="font-semibold" style={{ color: "#16a34a" }}>Всё в порядке</p>
              <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
                Нет активных алертов. Задачи выполнены, остатки в норме.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-white rounded-xl p-5 shadow-sm"
                  style={{
                    border: `1px solid ${alert.level === "critical" ? "#fecaca" : "#e2e8f0"}`,
                    borderLeft: `4px solid ${alert.level === "critical" ? "#dc2626" : "#f59e0b"}`,
                  }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: alert.level === "critical" ? "#fee2e2" : "#fef3c7",
                            color: alert.level === "critical" ? "#dc2626" : "#d97706",
                          }}>
                          {alert.level === "critical" ? "🔴 Критично" : "🟡 Важно"}
                        </span>
                        <span className="font-semibold text-sm" style={{ color: "#0f172a" }}>
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>
                        {alert.message}
                      </p>
                      <p className="text-sm mt-1.5 font-medium" style={{ color: "#7c3aed" }}>
                        💡 {alert.recommendation}
                      </p>
                    </div>
                    <a href={alert.actionHref}
                      className="shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap"
                      style={{ backgroundColor: "#f8fafc", color: "#7c3aed", border: "1px solid #e2e8f0" }}>
                      {alert.actionLabel}
                      <ArrowRight size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks (1/3 width) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: "#0f172a" }}>Задачи команды</h2>
            <a href="/tasks" className="text-xs font-medium" style={{ color: "#7c3aed" }}>Все →</a>
          </div>

          {recentTasks.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center"
              style={{ border: "1px solid #e2e8f0" }}>
              <Package size={28} color="#cbd5e1" className="mx-auto mb-2" />
              <p className="text-sm" style={{ color: "#94a3b8" }}>Задач пока нет</p>
              <a href="/tasks" className="text-xs font-medium mt-2 block" style={{ color: "#7c3aed" }}>
                Создать задачу →
              </a>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm divide-y"
              style={{ border: "1px solid #e2e8f0" }}>
              {recentTasks.map((task) => (
                <div key={task.id} className="p-4">
                  <div className="flex items-start gap-2 mb-2">
                    {task.status === "done"
                      ? <CheckCircle2 size={15} color="#16a34a" className="mt-0.5 shrink-0" />
                      : <div className="w-3.5 h-3.5 rounded-full border-2 mt-0.5 shrink-0"
                          style={{ borderColor: task.status === "overdue" ? "#dc2626" : "#cbd5e1" }} />
                    }
                    <p className="text-sm font-medium leading-tight" style={{ color: "#0f172a" }}>
                      {task.title}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pl-5">
                    <TaskStatusBadge status={task.status} />
                    {task.deadline && (
                      <span className="text-xs" style={{ color: "#94a3b8" }}>
                        {new Date(task.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
