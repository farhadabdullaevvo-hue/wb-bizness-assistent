"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, TrendingUp, TrendingDown, Target, Calendar, Pencil, Trash2, X, Check } from "lucide-react";
import type { PlanProgress } from "@/app/api/plans/progress/route";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн ₽`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс. ₽`;
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const STATUS = {
  ahead:    { label: "Опережаем план",    color: "#16a34a", bg: "#dcfce7", icon: "🚀" },
  on_track: { label: "По плану",          color: "#2563eb", bg: "#dbeafe", icon: "✅" },
  behind:   { label: "Отстаём от плана",  color: "#d97706", bg: "#fef3c7", icon: "⚠️" },
  critical: { label: "Критическое отставание", color: "#dc2626", bg: "#fee2e2", icon: "🔴" },
};

function ProgressBar({ pct, status }: { pct: number; status: PlanProgress["status"] }) {
  const color = STATUS[status].color;
  const clamped = Math.min(pct, 100);
  return (
    <div className="relative">
      <div className="h-5 rounded-full overflow-hidden" style={{ backgroundColor: "#f1f5f9" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
        {/* Маркер 100% */}
        <div className="absolute right-0 top-0 h-full w-px" style={{ backgroundColor: "#e2e8f0" }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
        <span className="text-xs" style={{ color: "#94a3b8" }}>100%</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon, color, bg }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: "1px solid #e2e8f0" }}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium" style={{ color: "#64748b" }}>{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <p className="text-xl font-bold" style={{ color: "#0f172a" }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{sub}</p>}
    </div>
  );
}

export default function PlansPage() {
  const [month, setMonth] = useState(currentMonth());
  const [progress, setProgress] = useState<PlanProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProgress = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plans/progress?month=${m}`);
      const data: PlanProgress = await res.json();
      setProgress(data);
      if (!data.plan) setShowForm(true);
    } catch {
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProgress(month); }, [month, fetchProgress]);

  async function savePlan() {
    const target = parseFloat(targetInput.replace(/\s/g, "").replace(",", "."));
    if (!target || target <= 0) return;
    setSaving(true);
    await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, targetRevenue: target, note: noteInput || null }),
    });
    setSaving(false);
    setShowForm(false);
    setEditing(false);
    fetchProgress(month);
  }

  async function deletePlan() {
    if (!progress?.plan) return;
    if (!confirm("Удалить план на этот месяц?")) return;
    await fetch(`/api/plans/${progress.plan.id}`, { method: "DELETE" });
    fetchProgress(month);
  }

  function startEdit() {
    if (!progress?.plan) return;
    setTargetInput(String(progress.plan.targetRevenue));
    setNoteInput(progress.plan.note ?? "");
    setEditing(true);
    setShowForm(true);
  }

  const st = progress ? STATUS[progress.status] : null;

  return (
    <div className="p-8" style={{ maxWidth: 860 }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Планы продаж</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Ставьте цель — следите за выполнением каждый день</p>
        </div>
        {progress?.plan && !showForm && (
          <div className="flex items-center gap-2">
            <button onClick={startEdit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
              <Pencil size={14} /> Изменить
            </button>
            <button onClick={deletePlan}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }}>
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Month switcher */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setMonth(prevMonth(month))}
          className="px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
          ←
        </button>
        <span className="text-base font-semibold capitalize" style={{ color: "#0f172a", minWidth: 180, textAlign: "center" }}>
          {monthLabel(month)}
        </span>
        <button onClick={() => setMonth(nextMonth(month))}
          disabled={month >= currentMonth()}
          className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-30"
          style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
          →
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} color="#7c3aed" className="animate-spin" />
        </div>
      ) : (
        <>
          {/* Form: создать / редактировать план */}
          {showForm && (
            <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm" style={{ border: "2px dashed #7c3aed" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold" style={{ color: "#0f172a" }}>
                  {editing ? "Изменить план" : `Поставить план на ${monthLabel(month)}`}
                </h2>
                {editing && (
                  <button onClick={() => { setShowForm(false); setEditing(false); }}>
                    <X size={18} color="#94a3b8" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>
                    Цель по выручке (₽) *
                  </label>
                  <input
                    value={targetInput}
                    onChange={e => setTargetInput(e.target.value)}
                    placeholder="Например: 1 500 000"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "1.5px solid #e2e8f0", color: "#0f172a" }}
                    onFocus={e => e.currentTarget.style.borderColor = "#7c3aed"}
                    onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>
                    Комментарий
                  </label>
                  <input
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    placeholder="Например: сезонный план с учётом акций"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "1.5px solid #e2e8f0", color: "#0f172a" }}
                    onFocus={e => e.currentTarget.style.borderColor = "#7c3aed"}
                    onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  {editing && (
                    <button onClick={() => { setShowForm(false); setEditing(false); }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                      style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
                      Отмена
                    </button>
                  )}
                  <button onClick={savePlan} disabled={!targetInput.trim() || saving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: targetInput.trim() ? "#7c3aed" : "#e2e8f0",
                      color: targetInput.trim() ? "white" : "#94a3b8",
                    }}>
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    {editing ? "Сохранить" : "Поставить план"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Нет плана */}
          {!progress?.plan && !showForm && (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm mb-6"
              style={{ border: "1px solid #e2e8f0" }}>
              <Target size={40} color="#cbd5e1" className="mx-auto mb-3" />
              <p className="font-semibold text-lg mb-1" style={{ color: "#0f172a" }}>
                Нет плана на {monthLabel(month)}
              </p>
              <p className="text-sm mb-4" style={{ color: "#94a3b8" }}>
                Поставьте цель по выручке — система будет считать прогресс каждый день
              </p>
              <button onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#7c3aed", color: "white" }}>
                <Plus size={16} /> Поставить план
              </button>
            </div>
          )}

          {/* Прогресс */}
          {progress?.plan && !showForm && (
            <>
              {/* Статус-баннер */}
              {st && (
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl mb-6"
                  style={{ backgroundColor: st.bg, border: `1px solid ${st.color}30` }}>
                  <span className="text-xl">{st.icon}</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: st.color }}>{st.label}</p>
                    <p className="text-xs" style={{ color: st.color + "cc" }}>
                      {progress.deviation > 0
                        ? `Опережение +${progress.deviation}% от плана по темпу`
                        : progress.deviation < 0
                        ? `Отставание ${progress.deviation}% от плана по темпу`
                        : "Точно по плану"}
                      {!progress.wbAvailable && " · демо-данные"}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs font-medium" style={{ color: st.color }}>
                      {progress.daysRemaining} дн. до конца месяца
                    </p>
                  </div>
                </div>
              )}

              {/* Прогресс-бар */}
              <div className="bg-white rounded-2xl p-6 mb-5 shadow-sm" style={{ border: "1px solid #e2e8f0" }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#64748b" }}>Выполнение плана</p>
                    <p className="text-2xl font-bold mt-0.5" style={{ color: "#0f172a" }}>
                      {fmt(progress.actualRevenue)}
                      <span className="text-base font-normal ml-2" style={{ color: "#94a3b8" }}>
                        из {fmt(progress.targetRevenue)}
                      </span>
                    </p>
                  </div>
                  {progress.plan.note && (
                    <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
                      {progress.plan.note}
                    </span>
                  )}
                </div>
                <ProgressBar pct={progress.completionPct} status={progress.status} />
              </div>

              {/* Метрики */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                <MetricCard
                  label="Факт в день"
                  value={fmt(progress.actualDailyPace)}
                  sub={`за ${progress.daysElapsed} дн.`}
                  icon={TrendingUp}
                  color="#2563eb" bg="#dbeafe"
                />
                <MetricCard
                  label="Нужно в день"
                  value={fmt(progress.requiredDailyPace)}
                  sub="по плану"
                  icon={Target}
                  color="#7c3aed" bg="#ede9fe"
                />
                <MetricCard
                  label="Нужно добрать"
                  value={fmt(progress.remainingRevenue)}
                  sub={`за ${progress.daysRemaining} дн.`}
                  icon={progress.status === "ahead" ? TrendingUp : TrendingDown}
                  color={progress.status === "ahead" ? "#16a34a" : "#dc2626"}
                  bg={progress.status === "ahead" ? "#dcfce7" : "#fee2e2"}
                />
                <MetricCard
                  label="Темп для закрытия"
                  value={fmt(progress.requiredRemainingPace)}
                  sub="в день до конца"
                  icon={Calendar}
                  color="#d97706" bg="#fef3c7"
                />
              </div>

              {/* Совет */}
              {progress.status === "behind" || progress.status === "critical" ? (
                <div className="rounded-xl px-5 py-4" style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa" }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: "#c2410c" }}>
                    💡 Что можно сделать:
                  </p>
                  <ul className="text-sm space-y-1" style={{ color: "#9a3412" }}>
                    <li>• Запустите дополнительную рекламную кампанию</li>
                    <li>• Сделайте акцию или скидку на популярные товары</li>
                    <li>• Проверьте позиции в поиске WB — возможно просели</li>
                    <li>• Для закрытия плана нужно {fmt(progress.requiredRemainingPace)}/день</li>
                  </ul>
                </div>
              ) : progress.status === "ahead" ? (
                <div className="rounded-xl px-5 py-4" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <p className="text-sm font-semibold" style={{ color: "#15803d" }}>
                    🚀 Отличный темп! Текущий темп {fmt(progress.actualDailyPace)}/день — опережаете план.
                    При таком темпе план будет выполнен досрочно.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl px-5 py-4" style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" }}>
                  <p className="text-sm font-semibold" style={{ color: "#1d4ed8" }}>
                    ✅ Идёте по плану. Нужно {fmt(progress.requiredRemainingPace)}/день чтобы выполнить план к концу месяца.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
