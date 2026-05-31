"use client";

import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Loader2, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Package, WifiOff } from "lucide-react";
import type { Product } from "@/app/api/wb/products/route";

function fmtRev(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн ₽`;
  if (n >= 10_000) return `${Math.round(n / 1_000)} тыс. ₽`;
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function OrdersTrend({ current, prev }: { current: number; prev: number }) {
  const diff = current - prev;
  if (diff === 0 || (current === 0 && prev === 0)) return null;
  const up = diff > 0;
  return (
    <span className="text-xs font-medium" style={{ color: up ? "#16a34a" : "#dc2626" }}>
      {up ? "↑" : "↓"}{Math.abs(diff)}
    </span>
  );
}

function RevenueTrend({ current, prev }: { current: number; prev: number }) {
  if (prev === 0 || current === 0) return null;
  const pct = Math.round(((current - prev) / prev) * 100);
  if (pct === 0) return null;
  const up = pct > 0;
  return (
    <span className="text-xs font-medium" style={{ color: up ? "#16a34a" : "#dc2626" }}>
      {up ? "↑" : "↓"}{Math.abs(pct)}%
    </span>
  );
}

function StatusBadge({ status }: { status: Product["status"] }) {
  const map = {
    critical: { label: "Критично",  bg: "#fee2e2", color: "#dc2626" },
    warning:  { label: "Внимание",  bg: "#fef3c7", color: "#d97706" },
    ok:       { label: "В порядке", bg: "#dcfce7", color: "#16a34a" },
  };
  const s = map[status];
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function RecommendationChip({ daysLeft }: { daysLeft: number | null }) {
  if (daysLeft === null) return null;
  if (daysLeft < 30) return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
      style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
      Срочно закупить
    </span>
  );
  if (daysLeft < 60) return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
      style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
      Закупить скоро
    </span>
  );
  if (daysLeft < 90) return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
      style={{ backgroundColor: "#ede9fe", color: "#7c3aed" }}>
      Запланировать
    </span>
  );
  return null;
}

function DaysLeft({ daysLeft }: { daysLeft: number | null }) {
  if (daysLeft === null) return <span style={{ color: "#94a3b8" }}>—</span>;
  const color = daysLeft < 30 ? "#dc2626" : daysLeft < 60 ? "#d97706" : daysLeft < 90 ? "#7c3aed" : "#16a34a";
  return <span className="font-semibold" style={{ color }}>{daysLeft} дн.</span>;
}

function ProductRow({ product }: { product: Product }) {
  const [open, setOpen] = useState(product.status !== "ok");

  const borderLeft =
    product.status === "critical" ? "4px solid #dc2626" :
    product.status === "warning"  ? "4px solid #f59e0b" :
    "4px solid transparent";

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-3"
      style={{ border: "1px solid #e2e8f0", borderLeft }}>

      <button onClick={() => setOpen(p => !p)}
        className="w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors">

        {/* Identity row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-semibold text-sm" style={{ color: "#0f172a" }}>{product.name}</span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
              style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
              {product.article}
            </span>
            <StatusBadge status={product.status} />
            {product.catalogStatus && product.catalogStatus !== "Без статуса" && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                style={{ backgroundColor: "#ede9fe", color: "#7c3aed" }}>
                {product.catalogStatus}
              </span>
            )}
            {product.responsible && (
              <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
                {product.responsible}
              </span>
            )}
          </div>
          <div className="shrink-0 mt-0.5" style={{ color: "#94a3b8" }}>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div>
            <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>Заказов сег.</p>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold" style={{ color: "#0f172a" }}>{product.ordersToday}</span>
              <OrdersTrend current={product.ordersToday} prev={product.ordersYesterday} />
            </div>
          </div>

          <div>
            <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>Выручка сег.</p>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold" style={{ color: "#0f172a" }}>
                {product.revenueToday > 0 ? fmtRev(product.revenueToday) : "—"}
              </span>
              <RevenueTrend current={product.revenueToday} prev={product.revenueYesterday} />
            </div>
          </div>

          <div>
            <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>Остаток</p>
            <span className="text-sm font-bold" style={{ color: "#0f172a" }}>
              {product.totalQty.toLocaleString("ru-RU")} шт.
            </span>
          </div>

          <div>
            <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>Запас</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm"><DaysLeft daysLeft={product.daysLeft} /></span>
              <RecommendationChip daysLeft={product.daysLeft} />
            </div>
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-5 pb-5 pt-3 border-t" style={{ borderColor: "#f1f5f9" }}>
          <div className="grid grid-cols-2 gap-6">

            {/* Warehouses */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "#64748b" }}>Склады WB</p>
              {product.warehouses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {product.warehouses.map(wh => (
                    <div key={wh.name} className="px-2.5 py-1.5 rounded-lg"
                      style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <p className="text-xs font-medium" style={{ color: "#0f172a" }}>{wh.name}</p>
                      <p className="text-xs" style={{ color: "#64748b" }}>{wh.qty} шт.</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: "#94a3b8" }}>Нет данных</p>
              )}
            </div>

            {/* Yesterday + returns + sizes */}
            <div className="space-y-3">
              {(product.ordersYesterday > 0 || product.revenueYesterday > 0) && (
                <p className="text-xs" style={{ color: "#64748b" }}>
                  Вчера:{" "}
                  <b>{product.ordersYesterday} зак.</b>
                  {product.revenueYesterday > 0 && ` · ${fmtRev(product.revenueYesterday)}`}
                </p>
              )}

              {product.returns > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
                  Возвраты: {product.returns} шт.
                </span>
              )}

              {product.hasSizes && (
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "#64748b" }}>По размерам:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.sizes.map(s => {
                      const c = {
                        out: { bg: "#fee2e2", color: "#dc2626", border: "#fecaca" },
                        low: { bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
                        ok:  { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
                      }[s.status];
                      return (
                        <div key={s.size} className="flex flex-col items-center px-2.5 py-1.5 rounded-lg min-w-[44px]"
                          style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
                          <span className="text-xs font-bold" style={{ color: c.color }}>{s.size}</span>
                          <span className="text-xs" style={{ color: c.color }}>
                            {s.status === "out" ? "нет" : `${s.quantity} шт`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"error" | null>(null);
  const [wbAvailable, setWbAvailable] = useState(true);
  const [filter, setFilter] = useState<"all" | "critical" | "warning">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");

  const fetchProducts = useCallback(async (bust = false) => {
    setError(null);
    try {
      const url = bust ? `/api/wb/products?t=${Date.now()}` : "/api/wb/products";
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(data.products ?? []);
      setUpdatedAt(data.updatedAt ?? "");
      setWbAvailable(data.wbAvailable ?? false);
    } catch {
      setError("error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function handleRefresh() {
    setRefreshing(true);
    setLoading(true);
    await fetchProducts(true);
  }

  const filtered = filter === "all" ? products : products.filter(p => p.status === filter);
  const counts = {
    all:      products.length,
    critical: products.filter(p => p.status === "critical").length,
    warning:  products.filter(p => p.status === "warning").length,
  };
  const totalOrdersToday  = products.reduce((s, p) => s + p.ordersToday, 0);
  const totalRevenueToday = products.reduce((s, p) => s + p.revenueToday, 0);
  const alertProducts     = products.filter(p => p.status === "critical").slice(0, 3);

  return (
    <div className="p-8" style={{ maxWidth: 1000 }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Сводная по артикулам</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            {updatedAt
              ? `Обновлено ${new Date(updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
              : "Остатки, заказы и выручка по каждому артикулу"}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
          {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
          Обновить
        </button>
      </div>

      {/* Error banners */}
      {!wbAvailable && !loading && !error && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
          style={{ backgroundColor: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
          <WifiOff size={15} />
          WB API недоступен — показываем товары из каталога без данных об остатках. Нажмите «Обновить» через минуту.
        </div>
      )}
      {error === "error" && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
          style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }}>
          <AlertTriangle size={15} />
          Ошибка загрузки данных.
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <>
          {/* Alert strip */}
          {alertProducts.length > 0 && (
            <div className="mb-5 px-4 py-3 rounded-xl"
              style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "#c2410c" }}>
                ⚠ Требуют внимания: {counts.critical} товар{counts.critical === 1 ? "" : counts.critical < 5 ? "а" : "ов"}
              </p>
              <div className="flex flex-wrap gap-2">
                {alertProducts.map(p => (
                  <span key={p.article} className="text-xs px-2.5 py-1 rounded-lg font-medium"
                    style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
                    {p.name}{p.daysLeft !== null ? ` · ${p.daysLeft} дн.` : ""}
                  </span>
                ))}
                {counts.critical > 3 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
                    +{counts.critical - 3} ещё
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Summary stats */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <Package size={14} style={{ color: "#64748b" }} />
              <span className="text-sm" style={{ color: "#0f172a" }}>
                <b>{counts.all}</b> <span style={{ color: "#64748b" }}>артикулов</span>
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl"
              style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <span className="text-sm" style={{ color: "#0f172a" }}>
                Заказов сегодня: <b>{totalOrdersToday}</b>
              </span>
            </div>
            {totalRevenueToday > 0 && (
              <div className="px-3 py-2 rounded-xl"
                style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <span className="text-sm" style={{ color: "#0f172a" }}>
                  Выручка: <b>{fmtRev(totalRevenueToday)}</b>
                </span>
              </div>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ backgroundColor: "#f1f5f9" }}>
            {([
              { key: "all",      label: `Все (${counts.all})` },
              { key: "critical", label: `🔴 Критично (${counts.critical})` },
              { key: "warning",  label: `🟡 Внимание (${counts.warning})` },
            ] as const).map(tab => (
              <button key={tab.key}
                onClick={() => setFilter(tab.key)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: filter === tab.key ? "white" : "transparent",
                  color: filter === tab.key ? "#0f172a" : "#64748b",
                  boxShadow: filter === tab.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Products list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} color="#7c3aed" className="animate-spin" />
        </div>
      ) : error ? null : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle2 size={40} color="#86efac" className="mb-3" />
          <p className="font-semibold" style={{ color: "#16a34a" }}>
            {filter === "all" ? "Каталог пуст — загрузите артикулы на странице Команда" : "В этой категории всё хорошо"}
          </p>
        </div>
      ) : (
        <div>
          {filtered.map(p => <ProductRow key={p.article} product={p} />)}
        </div>
      )}
    </div>
  );
}
