"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Upload, Download, Trash2, Loader2, TrendingUp, TrendingDown, X, FileSpreadsheet, CheckCircle2 } from "lucide-react";

interface Expense {
  id: string; month: string; category: string; amount: number; note: string | null; source: string;
}
interface Summary {
  revenue: number; totalExpenses: number; profit: number; margin: number;
  wbAvailable: boolean; byCategory: Record<string, number>;
}
interface CostsData { month: string; expenses: Expense[]; summary: Summary }

const CATEGORIES = ["Себестоимость", "Реклама WB", "Логистика", "Прочие"];
const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  "Себестоимость": { bg: "#fee2e2", color: "#dc2626" },
  "Реклама WB":   { bg: "#fef3c7", color: "#d97706" },
  "Логистика":    { bg: "#dbeafe", color: "#2563eb" },
  "Прочие":       { bg: "#f1f5f9", color: "#64748b" },
};

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн ₽`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)} тыс. ₽`;
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export default function CostsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<CostsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: CATEGORIES[0], amount: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/costs?month=${m}`);
      setData(await res.json());
    } catch { setData(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(month); }, [month, fetchData]);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount) return;
    setSaving(true);
    await fetch("/api/costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, category: form.category, amount: parseFloat(form.amount.replace(/\s/g, "").replace(",", ".")), note: form.note || null }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ category: CATEGORIES[0], amount: "", note: "" });
    fetchData(month);
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/costs/${id}`, { method: "DELETE" });
    fetchData(month);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/costs/import", { method: "POST", body: fd });
      const result = await res.json();
      setImportResult(result);
      fetchData(month);
    } catch { setImportResult({ imported: 0, errors: ["Ошибка загрузки файла"] }); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const s = data?.summary;

  return (
    <div className="p-8" style={{ maxWidth: 900 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Расходы и прибыль</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Добавьте расходы — увидите реальную прибыль</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/costs/template" download
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
            <Download size={14} /> Шаблон Excel
          </a>
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer"
            style={{ backgroundColor: "#dbeafe", color: "#2563eb", border: "1px solid #bfdbfe" }}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Загрузить Excel
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: "#7c3aed", color: "white" }}>
            <Plus size={14} /> Добавить
          </button>
        </div>
      </div>

      {/* Month switcher */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setMonth(prevMonth(month))}
          className="px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>←</button>
        <span className="text-base font-semibold capitalize" style={{ color: "#0f172a", minWidth: 180, textAlign: "center" }}>
          {monthLabel(month)}
        </span>
        <button onClick={() => setMonth(nextMonth(month))} disabled={month >= currentMonth()}
          className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-30"
          style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>→</button>
      </div>

      {/* Import result */}
      {importResult && (
        <div className="mb-5 px-4 py-3 rounded-xl flex items-start gap-3"
          style={{
            backgroundColor: importResult.errors.length === 0 ? "#dcfce7" : "#fef3c7",
            border: `1px solid ${importResult.errors.length === 0 ? "#86efac" : "#fde68a"}`,
          }}>
          <CheckCircle2 size={16} color={importResult.errors.length === 0 ? "#16a34a" : "#d97706"} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: importResult.errors.length === 0 ? "#15803d" : "#92400e" }}>
              Импортировано: {importResult.imported} строк
            </p>
            {importResult.errors.map((err, i) => (
              <p key={i} className="text-xs mt-1" style={{ color: "#dc2626" }}>• {err}</p>
            ))}
          </div>
          <button onClick={() => setImportResult(null)}><X size={15} color="#94a3b8" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} color="#7c3aed" className="animate-spin" />
        </div>
      ) : (
        <>
          {/* P&L Summary */}
          {s && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: "1px solid #e2e8f0" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "#64748b" }}>
                  Выручка {!s.wbAvailable && <span style={{ color: "#f59e0b" }}>(демо)</span>}
                </p>
                <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>{fmt(s.revenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={13} color="#16a34a" />
                  <span className="text-xs" style={{ color: "#16a34a" }}>от WB (forPay)</span>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: "1px solid #e2e8f0" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "#64748b" }}>Расходы</p>
                <p className="text-2xl font-bold" style={{ color: "#dc2626" }}>{fmt(s.totalExpenses)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown size={13} color="#dc2626" />
                  <span className="text-xs" style={{ color: "#dc2626" }}>{data!.expenses.length} статей</span>
                </div>
              </div>
              <div className="rounded-xl p-5 shadow-sm"
                style={{
                  border: `1px solid ${s.profit >= 0 ? "#86efac" : "#fecaca"}`,
                  backgroundColor: s.profit >= 0 ? "#f0fdf4" : "#fff5f5",
                }}>
                <p className="text-xs font-medium mb-2" style={{ color: "#64748b" }}>
                  Прибыль · маржа {s.margin}%
                </p>
                <p className="text-2xl font-bold" style={{ color: s.profit >= 0 ? "#16a34a" : "#dc2626" }}>
                  {s.profit >= 0 ? "+" : ""}{fmt(s.profit)}
                </p>
                <div className="w-full h-1.5 rounded-full mt-2" style={{ backgroundColor: "#e2e8f0" }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(Math.max(s.margin, 0), 100)}%`,
                    backgroundColor: s.margin >= 20 ? "#16a34a" : s.margin >= 10 ? "#d97706" : "#dc2626",
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Breakdown by category */}
          {s && Object.keys(s.byCategory).length > 0 && (
            <div className="bg-white rounded-xl p-5 mb-6 shadow-sm" style={{ border: "1px solid #e2e8f0" }}>
              <p className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>По категориям</p>
              <div className="space-y-2">
                {Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                  const pct = s.totalExpenses > 0 ? Math.round((amt / s.totalExpenses) * 100) : 0;
                  const c = CAT_COLORS[cat] ?? { bg: "#f1f5f9", color: "#64748b" };
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.bg, color: c.color, minWidth: 110 }}>
                        {cat}
                      </span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#f1f5f9" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                      </div>
                      <span className="text-sm font-semibold shrink-0" style={{ color: "#0f172a", minWidth: 90, textAlign: "right" }}>
                        {fmt(amt)}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: "#94a3b8", minWidth: 32 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expense list */}
          {data!.expenses.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center shadow-sm" style={{ border: "1px solid #e2e8f0" }}>
              <FileSpreadsheet size={36} color="#cbd5e1" className="mx-auto mb-3" />
              <p className="font-semibold mb-1" style={{ color: "#0f172a" }}>Нет расходов за {monthLabel(month)}</p>
              <p className="text-sm mb-4" style={{ color: "#94a3b8" }}>
                Добавьте вручную или загрузите Excel-файл
              </p>
              <div className="flex items-center justify-center gap-3">
                <a href="/api/costs/template" download
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                  <Download size={14} /> Скачать шаблон
                </a>
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: "#7c3aed", color: "white" }}>
                  <Plus size={14} /> Добавить расход
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#f1f5f9" }}>
                <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Список расходов</p>
                <span className="text-xs" style={{ color: "#94a3b8" }}>{data!.expenses.length} записей</span>
              </div>
              {data!.expenses.map(exp => {
                const c = CAT_COLORS[exp.category] ?? { bg: "#f1f5f9", color: "#64748b" };
                return (
                  <div key={exp.id} className="flex items-center gap-4 px-5 py-3.5 border-b group last:border-0"
                    style={{ borderColor: "#f8fafc" }}>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.bg, color: c.color }}>
                      {exp.category}
                    </span>
                    <span className="text-sm flex-1" style={{ color: "#475569" }}>
                      {exp.note || "—"}
                    </span>
                    {exp.source === "excel" && (
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "#ede9fe", color: "#7c3aed" }}>Excel</span>
                    )}
                    <span className="text-sm font-bold shrink-0" style={{ color: "#0f172a" }}>
                      {fmt(exp.amount)}
                    </span>
                    <button onClick={() => deleteExpense(exp.id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50">
                      <Trash2 size={14} color="#dc2626" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add expense modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#f1f5f9" }}>
              <h2 className="text-base font-semibold" style={{ color: "#0f172a" }}>Добавить расход</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={18} color="#94a3b8" />
              </button>
            </div>
            <form onSubmit={addExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Категория</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: "1.5px solid #e2e8f0", color: "#0f172a" }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Сумма (₽) *</label>
                <input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="Например: 150 000"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: "1.5px solid #e2e8f0", color: "#0f172a" }}
                  onFocus={e => e.currentTarget.style.borderColor = "#7c3aed"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Комментарий</label>
                <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Например: закупка у поставщика Иванова"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: "1.5px solid #e2e8f0", color: "#0f172a" }}
                  onFocus={e => e.currentTarget.style.borderColor = "#7c3aed"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>Отмена</button>
                <button type="submit" disabled={!form.amount || saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ backgroundColor: form.amount ? "#7c3aed" : "#e2e8f0", color: form.amount ? "white" : "#94a3b8" }}>
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
