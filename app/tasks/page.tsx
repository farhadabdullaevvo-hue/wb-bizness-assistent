"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle2, Clock, Trash2, X, Loader2, AlertCircle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: string;
  priority: string;
  deadline: string | null;
  note: string | null;
  createdAt: string;
}

const ASSIGNEES = ["Менеджер Аня", "Маркетолог Дима", "Закупщик Саша", "Я (собственник)"];
const PRIORITIES = [
  { value: "low",      label: "Низкий",      color: "#64748b", bg: "#f1f5f9" },
  { value: "normal",   label: "Обычный",     color: "#2563eb", bg: "#dbeafe" },
  { value: "high",     label: "Высокий",     color: "#d97706", bg: "#fef3c7" },
  { value: "critical", label: "Критичный",   color: "#dc2626", bg: "#fee2e2" },
];
const STATUSES = [
  { value: "todo",     label: "Не начата",  color: "#64748b", bg: "#f1f5f9" },
  { value: "progress", label: "В работе",   color: "#2563eb", bg: "#dbeafe" },
  { value: "done",     label: "Выполнена",  color: "#16a34a", bg: "#dcfce7" },
  { value: "overdue",  label: "Просрочена", color: "#dc2626", bg: "#fee2e2" },
];

function Badge({ value, map }: { value: string; map: typeof STATUSES }) {
  const s = map.find(m => m.value === value) ?? map[0];
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "", assignee: ASSIGNEES[0], priority: "normal", deadline: "", note: "",
  });

  useEffect(() => { fetchTasks(); }, []);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const task = await res.json();
      setTasks(prev => [task, ...prev]);
      setForm({ title: "", assignee: ASSIGNEES[0], priority: "normal", deadline: "", note: "" });
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  const filtered = tasks.filter(t => {
    if (filter === "all") return true;
    if (filter === "active") return t.status !== "done";
    if (filter === "done") return t.status === "done";
    if (filter === "overdue") return t.status === "overdue";
    return true;
  });

  const counts = {
    all: tasks.length,
    active: tasks.filter(t => t.status !== "done").length,
    done: tasks.filter(t => t.status === "done").length,
    overdue: tasks.filter(t => t.status === "overdue").length,
  };

  return (
    <div className="p-8" style={{ maxWidth: 900 }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Задачи команды</h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
            Всего: {tasks.length} · Активных: {counts.active} · Просрочено: {counts.overdue}
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ backgroundColor: "#7c3aed", color: "white" }}>
          <Plus size={16} />
          Новая задача
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ backgroundColor: "#f1f5f9" }}>
        {[
          { key: "all",     label: `Все (${counts.all})` },
          { key: "active",  label: `Активные (${counts.active})` },
          { key: "done",    label: `Выполнены (${counts.done})` },
          { key: "overdue", label: `Просрочены (${counts.overdue})` },
        ].map(tab => (
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

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} color="#7c3aed" className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 size={40} color="#cbd5e1" className="mb-3" />
          <p className="font-medium" style={{ color: "#94a3b8" }}>
            {filter === "done" ? "Нет выполненных задач" : "Нет задач"}
          </p>
          <p className="text-sm mt-1" style={{ color: "#cbd5e1" }}>
            Нажмите «Новая задача» чтобы добавить
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <div key={task.id}
              className="bg-white rounded-xl p-4 flex items-start gap-4 group transition-all"
              style={{ border: "1px solid #e2e8f0" }}>

              {/* Done toggle */}
              <button
                onClick={() => updateStatus(task.id, task.status === "done" ? "todo" : "done")}
                className="mt-0.5 shrink-0 transition-transform hover:scale-110">
                {task.status === "done"
                  ? <CheckCircle2 size={20} color="#16a34a" fill="#16a34a" />
                  : <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: task.status === "overdue" ? "#dc2626" : "#cbd5e1" }}>
                      {task.status === "overdue" && <AlertCircle size={12} color="#dc2626" />}
                    </div>
                }
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-tight"
                    style={{
                      color: "#0f172a",
                      textDecoration: task.status === "done" ? "line-through" : "none",
                      opacity: task.status === "done" ? 0.5 : 1,
                    }}>
                    {task.title}
                  </p>
                  {/* Status selector */}
                  <select
                    value={task.status}
                    onChange={e => updateStatus(task.id, e.target.value)}
                    className="text-xs rounded-lg px-2 py-1 font-medium outline-none cursor-pointer shrink-0"
                    style={{
                      backgroundColor: STATUSES.find(s => s.value === task.status)?.bg ?? "#f1f5f9",
                      color: STATUSES.find(s => s.value === task.status)?.color ?? "#64748b",
                      border: "none",
                    }}>
                    {STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-xs" style={{ color: "#64748b" }}>
                    👤 {task.assignee}
                  </span>
                  <Badge value={task.priority} map={PRIORITIES} />
                  {task.deadline && (
                    <span className="flex items-center gap-1 text-xs"
                      style={{ color: "#94a3b8" }}>
                      <Clock size={11} />
                      {new Date(task.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                    </span>
                  )}
                  {task.note && (
                    <span className="text-xs italic truncate max-w-xs" style={{ color: "#94a3b8" }}>
                      {task.note}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button onClick={() => deleteTask(task.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50">
                <Trash2 size={15} color="#dc2626" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create task modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: "#f1f5f9" }}>
              <h2 className="text-base font-semibold" style={{ color: "#0f172a" }}>
                Новая задача
              </h2>
              <button onClick={() => setShowForm(false)}
                className="p-1 rounded-lg hover:bg-gray-100">
                <X size={18} color="#94a3b8" />
              </button>
            </div>

            <form onSubmit={createTask} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                  Задача *
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Например: Проверить остатки на складе"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: "1.5px solid #e2e8f0", color: "#0f172a" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#7c3aed"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                  autoFocus
                />
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                  Исполнитель *
                </label>
                <select
                  value={form.assignee}
                  onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: "1.5px solid #e2e8f0", color: "#0f172a" }}>
                  {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {/* Priority + Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                    Приоритет
                  </label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "1.5px solid #e2e8f0", color: "#0f172a" }}>
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                    Дедлайн
                  </label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "1.5px solid #e2e8f0", color: "#0f172a" }}
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                  Комментарий
                </label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Дополнительные детали..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ border: "1.5px solid #e2e8f0", color: "#0f172a" }}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
                  Отмена
                </button>
                <button type="submit" disabled={!form.title.trim() || submitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: form.title.trim() ? "#7c3aed" : "#e2e8f0",
                    color: form.title.trim() ? "white" : "#94a3b8",
                  }}>
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Создать задачу
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
