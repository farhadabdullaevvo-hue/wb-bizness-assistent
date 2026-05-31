"use client";

import { useEffect, useState, useRef } from "react";
import { Users, Upload, ChevronDown, ChevronUp, Package } from "lucide-react";

interface Product {
  id: string;
  nmId: number;
  article: string;
  subject: string | null;
  name: string | null;
  status: string;
  responsible: string | null;
}

interface Employee {
  name: string;
  total: number;
  byStatus: Record<string, number>;
  products: Product[];
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "Без статуса":  { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" },
  "Активный":     { bg: "rgba(34,197,94,0.15)",   color: "#22c55e" },
  "Стоп":         { bg: "rgba(239,68,68,0.15)",    color: "#ef4444" },
  "На паузе":     { bg: "rgba(245,158,11,0.15)",   color: "#f59e0b" },
  "Новинка":      { bg: "rgba(168,85,247,0.15)",   color: "#a855f7" },
  "Распродажа":   { bg: "rgba(251,146,60,0.15)",   color: "#fb923c" },
};

function statusStyle(s: string) {
  return STATUS_COLORS[s] ?? { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" };
}

export default function TeamPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ upserted: number; errors: string[]; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/catalog/employees");
      if (res.ok) setEmployees(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggle(name: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/catalog/import", { method: "POST", body: fd });
      const result = await res.json();
      setImportResult(result);
      await load();
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const totalProducts = employees.reduce((s, e) => s + e.total, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Команда</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Ответственные по артикулам · {totalProducts} товаров
          </p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: "#7c3aed", color: "white" }}
          >
            <Upload size={16} />
            {importing ? "Загружаю..." : "Загрузить Excel"}
          </button>
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className="px-4 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: importResult.errors.length ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)",
            border: `1px solid ${importResult.errors.length ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)"}`,
            color: importResult.errors.length ? "#f59e0b" : "#22c55e",
          }}>
          Загружено {importResult.upserted} из {importResult.total} строк.
          {importResult.errors.length > 0 && ` Ошибки: ${importResult.errors.slice(0, 3).join(", ")}`}
        </div>
      )}

      {/* Employee cards */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: "#1e293b" }} />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="py-20 text-center" style={{ color: "#475569" }}>
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Нет данных</p>
          <p className="text-sm mt-1">Загрузите Excel с артикулами и ответственными</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map(emp => {
            const open = expanded.has(emp.name);
            return (
              <div key={emp.name} className="rounded-xl overflow-hidden"
                style={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.06)" }}>
                {/* Employee header */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => toggle(emp.name)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>
                      {emp.name === "Не назначен" ? "?" : emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{emp.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                        {emp.total} артикулов
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Status pills */}
                    <div className="hidden sm:flex flex-wrap gap-1.5">
                      {Object.entries(emp.byStatus)
                        .filter(([, cnt]) => cnt > 0)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 4)
                        .map(([s, cnt]) => {
                          const style = statusStyle(s);
                          return (
                            <span key={s} className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: style.bg, color: style.color }}>
                              {s}: {cnt}
                            </span>
                          );
                        })}
                    </div>
                    {open ? <ChevronUp size={18} style={{ color: "#64748b" }} /> : <ChevronDown size={18} style={{ color: "#64748b" }} />}
                  </div>
                </button>

                {/* Products list */}
                {open && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            {["Артикул WB", "Артикул", "Предмет", "Название", "Статус"].map(h => (
                              <th key={h} className="px-4 py-2.5 text-left text-xs font-medium"
                                style={{ color: "#475569" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {emp.products.map(p => {
                            const st = statusStyle(p.status);
                            return (
                              <tr key={p.id}
                                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)")}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                <td className="px-4 py-2.5" style={{ color: "#64748b" }}>{p.nmId}</td>
                                <td className="px-4 py-2.5 font-medium text-white">{p.article}</td>
                                <td className="px-4 py-2.5" style={{ color: "#94a3b8" }}>{p.subject ?? "—"}</td>
                                <td className="px-4 py-2.5" style={{ color: "#94a3b8" }}>{p.name || "—"}</td>
                                <td className="px-4 py-2.5">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                                    style={{ backgroundColor: st.bg, color: st.color }}>
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalProducts > 0 && (
        <p className="text-xs text-right" style={{ color: "#334155" }}>
          <Package size={12} className="inline mr-1" />
          {totalProducts} товаров в каталоге
        </p>
      )}
    </div>
  );
}
