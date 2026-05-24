"use client";

import { useEffect, useState, useCallback } from "react";
import { ShoppingCart, RefreshCw, TrendingDown, AlertTriangle, CheckCircle, Minus, Plus, Download } from "lucide-react";

interface ProcurementItem {
  article: string;
  name: string;
  totalQty: number;
  dailyRate: number;
  daysLeft: number;
  runOutDate: string;
  orderDate: string;
  recommendedQty: number;
  status: "urgent" | "soon" | "ok" | "no_sales";
  sizes: { size: string; qty: number }[];
}

interface ProcurementData {
  items: ProcurementItem[];
  settings: { leadTimeDays: number; targetDays: number };
  wbAvailable: boolean;
  updatedAt: string;
}

const STATUS_META = {
  urgent:   { label: "Заказать сейчас!", color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: AlertTriangle },
  soon:     { label: "Заказать скоро",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: TrendingDown },
  ok:       { label: "Запас в норме",    color: "#22c55e", bg: "rgba(34,197,94,0.12)",   icon: CheckCircle },
  no_sales: { label: "Нет продаж",       color: "#64748b", bg: "rgba(100,116,139,0.08)", icon: Minus },
};

function fmt(n: number) { return n.toLocaleString("ru-RU"); }
function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function SettingsStepper({
  label, value, min, max, step, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm" style={{ color: "#94a3b8" }}>{label}</span>
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-7 h-7 rounded flex items-center justify-center transition-colors"
        style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
      >
        <Minus size={14} />
      </button>
      <span className="w-12 text-center text-sm font-semibold text-white">{value} дн.</span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-7 h-7 rounded flex items-center justify-center transition-colors"
        style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4,5,6,7,8].map(i => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.06)", width: `${50 + i * 7}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function ProcurementPage() {
  const [data, setData] = useState<ProcurementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leadTime, setLeadTime] = useState(14);
  const [targetDays, setTargetDays] = useState(90);
  const [filter, setFilter] = useState<"all" | "urgent" | "soon" | "ok" | "no_sales">("all");

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({
        leadTime: String(leadTime),
        targetDays: String(targetDays),
        ...(forceRefresh ? { refresh: "1" } : {}),
      });
      const res = await fetch(`/api/procurement?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [leadTime, targetDays]);

  useEffect(() => { load(); }, [load]);

  const items = data?.items ?? [];
  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);
  const urgentCount = items.filter(i => i.status === "urgent").length;
  const soonCount   = items.filter(i => i.status === "soon").length;

  const totalOrderQty = items
    .filter(i => i.status === "urgent" || i.status === "soon")
    .reduce((s, i) => s + i.recommendedQty, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Закупки и прогноз</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Когда закончится товар и сколько заказать
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/procurement/export?leadTime=${leadTime}&targetDays=${targetDays}`}
            download
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: "#1e293b", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}
          >
            <Download size={16} />
            Выгрузить Excel
          </a>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: "#7c3aed", color: "white" }}
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Обновляю..." : "Обновить данные"}
          </button>
        </div>
      </div>

      {/* Settings bar */}
      <div className="flex flex-wrap items-center gap-6 px-4 py-3 rounded-xl"
        style={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-sm font-medium text-white">Настройки прогноза:</span>
        <SettingsStepper label="Срок поставки" value={leadTime} min={1} max={60} step={1} onChange={setLeadTime} />
        <SettingsStepper label="Целевой запас" value={targetDays} min={30} max={180} step={10} onChange={setTargetDays} />
        <span className="text-xs" style={{ color: "#475569" }}>
          Изменение применяется автоматически
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Заказать сейчас", value: urgentCount, color: "#ef4444", sub: "артикулов" },
          { label: "Заказать скоро", value: soonCount, color: "#f59e0b", sub: "артикулов" },
          { label: "Итого к заказу", value: fmt(totalOrderQty), color: "#7c3aed", sub: "шт." },
        ].map(card => (
          <div key={card.label} className="rounded-xl p-4"
            style={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "#64748b" }}>{card.label}</p>
            <p className="text-3xl font-bold" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "urgent", "soon", "ok", "no_sales"] as const).map(tab => {
          const labels: Record<typeof tab, string> = {
            all: `Все (${items.length})`,
            urgent: `Срочно (${urgentCount})`,
            soon: `Скоро (${soonCount})`,
            ok: `Норма (${items.filter(i => i.status === "ok").length})`,
            no_sales: `Нет продаж (${items.filter(i => i.status === "no_sales").length})`,
          };
          const active = filter === tab;
          return (
            <button key={tab} onClick={() => setFilter(tab)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: active ? "#7c3aed" : "rgba(255,255,255,0.04)",
                color: active ? "white" : "#64748b",
              }}>
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Артикул / Название", "Остаток", "Темп продаж", "Дней запаса", "Кончится", "Заказать до", "Заказать (шт.)", "Статус"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium"
                    style={{ color: "#475569" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                : filtered.map(item => {
                    const meta = STATUS_META[item.status];
                    const StatusIcon = meta.icon;
                    const NON_SIZE = new Set(["0", "one size", "onesize", "без размера"]);
                    const hasSizes = item.sizes.some(s => !NON_SIZE.has(s.size.toLowerCase()));
                    return (
                      <tr key={item.article}
                        className="transition-colors"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {/* Article */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{item.article}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>{item.name}</div>
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{fmt(item.totalQty)} шт.</div>
                          {hasSizes && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.sizes
                                .filter(s => !NON_SIZE.has(s.size.toLowerCase()))
                                .map(s => (
                                  <span key={s.size}
                                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                                    style={{
                                      backgroundColor: s.qty === 0 ? "rgba(239,68,68,0.15)" : s.qty <= 3 ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.1)",
                                      color: s.qty === 0 ? "#ef4444" : s.qty <= 3 ? "#f59e0b" : "#22c55e",
                                    }}>
                                    {s.size}: {s.qty}
                                  </span>
                                ))}
                            </div>
                          )}
                        </td>

                        {/* Daily rate */}
                        <td className="px-4 py-3">
                          <span style={{ color: item.dailyRate > 0 ? "#94a3b8" : "#475569" }}>
                            {item.dailyRate > 0 ? `${item.dailyRate.toFixed(1)} шт/д` : "—"}
                          </span>
                        </td>

                        {/* Days left */}
                        <td className="px-4 py-3">
                          {item.status === "no_sales" ? (
                            <span style={{ color: "#475569" }}>—</span>
                          ) : (
                            <span className="font-semibold" style={{
                              color: item.daysLeft < 14 ? "#ef4444" : item.daysLeft < 35 ? "#f59e0b" : "#94a3b8",
                            }}>
                              {item.daysLeft} дн.
                            </span>
                          )}
                        </td>

                        {/* Run-out date */}
                        <td className="px-4 py-3" style={{ color: "#94a3b8" }}>
                          {fmtDate(item.runOutDate)}
                        </td>

                        {/* Order by date */}
                        <td className="px-4 py-3">
                          {item.orderDate ? (
                            <span className="font-medium"
                              style={{ color: item.status === "urgent" ? "#ef4444" : item.status === "soon" ? "#f59e0b" : "#94a3b8" }}>
                              {fmtDate(item.orderDate)}
                            </span>
                          ) : <span style={{ color: "#475569" }}>—</span>}
                        </td>

                        {/* Recommended qty */}
                        <td className="px-4 py-3">
                          {item.recommendedQty > 0 ? (
                            <span className="font-bold text-white">{fmt(item.recommendedQty)} шт.</span>
                          ) : <span style={{ color: "#475569" }}>—</span>}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: meta.bg, color: meta.color }}>
                            <StatusIcon size={12} />
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center" style={{ color: "#475569" }}>
            <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
            <p>Нет товаров в этой категории</p>
          </div>
        )}
      </div>

      {data && (
        <p className="text-xs text-right" style={{ color: "#334155" }}>
          Данные WB: {data.wbAvailable ? "реальные" : "демо-режим"} ·{" "}
          обновлено {new Date(data.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
