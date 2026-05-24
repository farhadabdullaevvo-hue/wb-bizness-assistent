"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertTriangle, Loader2, Bell } from "lucide-react";

export default function SettingsPage() {
  const [setupState, setSetupState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [setupMsg, setSetupMsg] = useState("");
  const [chatId, setChatId] = useState("");

  const [sendState, setSendState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [sendMsg, setSendMsg] = useState("");

  async function handleSetup() {
    setSetupState("loading");
    setSetupMsg("");
    try {
      const res = await fetch("/api/telegram/setup");
      const data = await res.json();
      if (data.chatId) {
        setSetupState("ok");
        setChatId(data.chatId);
        setSetupMsg(`Chat ID найден: ${data.chatId}. Проверьте Telegram — должно прийти приветственное сообщение.`);
      } else {
        setSetupState("error");
        setSetupMsg(data.error ?? "Ошибка. Напишите боту любое сообщение и попробуйте снова.");
      }
    } catch {
      setSetupState("error");
      setSetupMsg("Не удалось подключиться. Проверьте TELEGRAM_BOT_TOKEN в .env.local");
    }
  }

  async function handleSend(type: "morning" | "alerts") {
    setSendState("loading");
    setSendMsg("");
    try {
      const res = await fetch(`/api/telegram/send?type=${type}`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setSendState("ok");
        setSendMsg(type === "morning"
          ? "Утренняя сводка отправлена в Telegram!"
          : data.sent === 0
          ? "Нет критичных алертов — всё в порядке."
          : `Отправлено ${data.sent} алертов в Telegram.`);
      } else {
        setSendState("error");
        setSendMsg(data.error ?? "Ошибка отправки");
      }
    } catch {
      setSendState("error");
      setSendMsg("Ошибка отправки");
    }
  }

  return (
    <div className="p-8" style={{ maxWidth: 640 }}>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "#0f172a" }}>Настройки</h1>
      <p className="text-sm mb-8" style={{ color: "#64748b" }}>Подключение Telegram и уведомлений</p>

      {/* Telegram setup card */}
      <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm" style={{ border: "1px solid #e2e8f0" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#ede9fe" }}>
            <Bell size={20} color="#7c3aed" />
          </div>
          <div>
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Telegram-бот</h2>
            <p className="text-xs" style={{ color: "#64748b" }}>Уведомления и утренняя сводка</p>
          </div>
        </div>

        <div className="space-y-3 mb-5 text-sm" style={{ color: "#475569" }}>
          <p><b>1.</b> Откройте Telegram → найдите <b>@BotFather</b></p>
          <p><b>2.</b> Напишите <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "#f1f5f9" }}>/newbot</code> и создайте бота</p>
          <p><b>3.</b> Скопируйте токен в <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "#f1f5f9" }}>.env.local</code> → <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "#f1f5f9" }}>TELEGRAM_BOT_TOKEN=</code></p>
          <p><b>4.</b> Напишите боту любое сообщение в Telegram</p>
          <p><b>5.</b> Нажмите кнопку ниже — Chat ID определится автоматически</p>
        </div>

        <button onClick={handleSetup} disabled={setupState === "loading"}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ backgroundColor: "#7c3aed", color: "white" }}>
          {setupState === "loading"
            ? <><Loader2 size={15} className="animate-spin" /> Определяем Chat ID...</>
            : "Подключить Telegram"}
        </button>

        {setupState === "ok" && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{setupMsg}</span>
          </div>
        )}
        {setupState === "error" && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{setupMsg}</span>
          </div>
        )}

        {chatId && (
          <p className="mt-3 text-xs text-center" style={{ color: "#94a3b8" }}>
            Добавьте в .env.local: <code>TELEGRAM_CHAT_ID={chatId}</code>
          </p>
        )}
      </div>

      {/* Send controls */}
      <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: "1px solid #e2e8f0" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#dbeafe" }}>
            <Send size={20} color="#2563eb" />
          </div>
          <div>
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Отправить сейчас</h2>
            <p className="text-xs" style={{ color: "#64748b" }}>Проверьте как выглядят сообщения</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={() => handleSend("morning")} disabled={sendState === "loading"}
            className="py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ backgroundColor: "#f1f5f9", color: "#0f172a", border: "1px solid #e2e8f0" }}>
            {sendState === "loading" ? <Loader2 size={14} className="animate-spin mx-auto" /> : "🌅 Утренняя сводка"}
          </button>
          <button onClick={() => handleSend("alerts")} disabled={sendState === "loading"}
            className="py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }}>
            {sendState === "loading" ? <Loader2 size={14} className="animate-spin mx-auto" /> : "🔴 Критичные алерты"}
          </button>
        </div>

        {sendState === "ok" && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>
            <CheckCircle2 size={16} />
            {sendMsg}
          </div>
        )}
        {sendState === "error" && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
            <AlertTriangle size={16} />
            {sendMsg}
          </div>
        )}
      </div>
    </div>
  );
}
