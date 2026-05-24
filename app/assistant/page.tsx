"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTER_QUESTIONS = [
  "Почему могли упасть продажи вчера?",
  "Что делать если реклама перестала работать?",
  "Как правильно рассчитать цену товара на WB?",
  "Как поднять позиции в поиске Wildberries?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Добавляем пустое сообщение ассистента, будем заполнять стримингом
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const err = await response.json();
        if (err.error?.includes("ANTHROPIC_API_KEY")) {
          setHasApiKey(false);
        }
        setMessages([...newMessages, {
          role: "assistant",
          content: err.error || "Произошла ошибка. Попробуйте ещё раз.",
        }]);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: "assistant", content: assistantText }]);
      }
    } catch {
      setMessages([...newMessages, {
        role: "assistant",
        content: "Не удалось подключиться к серверу. Проверьте интернет-соединение.",
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-screen">

      {/* Header */}
      <div className="px-8 py-5 bg-white border-b flex items-center gap-3"
        style={{ borderColor: "#e2e8f0" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "#7c3aed" }}>
          <Bot size={20} color="white" />
        </div>
        <div>
          <h1 className="text-base font-semibold" style={{ color: "#0f172a" }}>
            ИИ-ассистент
          </h1>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Помогает управлять магазином на Wildberries
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs" style={{ color: "#64748b" }}>Claude Sonnet</span>
        </div>
      </div>

      {/* No API key warning */}
      {!hasApiKey && (
        <div className="mx-8 mt-4 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a", color: "#92400e" }}>
          <strong>API-ключ не задан.</strong> Добавьте ANTHROPIC_API_KEY в файл{" "}
          <code className="font-mono text-xs bg-yellow-100 px-1 rounded">webapp/.env.local</code>{" "}
          и перезапустите сервер. Получить ключ:{" "}
          <a href="https://console.anthropic.com" target="_blank"
            className="underline font-medium">console.anthropic.com</a>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: "#ede9fe" }}>
              <Sparkles size={32} color="#7c3aed" />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: "#0f172a" }}>
              Чем могу помочь?
            </h2>
            <p className="text-sm mb-8 max-w-sm" style={{ color: "#64748b" }}>
              Спросите меня про продажи, рекламу, остатки, ценообразование или любой бизнес-вопрос по WB
            </p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
              {STARTER_QUESTIONS.map((q) => (
                <button key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm px-4 py-3 rounded-xl transition-all hover:shadow-sm"
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    color: "#374151",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "#7c3aed";
                    (e.currentTarget as HTMLElement).style.color = "#7c3aed";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
                    (e.currentTarget as HTMLElement).style.color = "#374151";
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    backgroundColor: msg.role === "user" ? "#0f172a" : "#7c3aed",
                  }}>
                  {msg.role === "user"
                    ? <User size={15} color="white" />
                    : <Bot size={15} color="white" />}
                </div>

                {/* Bubble */}
                <div className="max-w-[80%]">
                  <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      backgroundColor: msg.role === "user" ? "#0f172a" : "white",
                      color: msg.role === "user" ? "white" : "#1e293b",
                      border: msg.role === "assistant" ? "1px solid #e2e8f0" : "none",
                      borderRadius: msg.role === "user"
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                    }}>
                    {msg.content}
                    {msg.role === "assistant" && msg.content === "" && isLoading && (
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                          style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                          style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                          style={{ animationDelay: "300ms" }} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-8 py-5 bg-white border-t" style={{ borderColor: "#e2e8f0" }}>
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите вопрос... (Enter — отправить, Shift+Enter — новая строка)"
            rows={1}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all"
            style={{
              border: "1.5px solid #e2e8f0",
              color: "#0f172a",
              backgroundColor: "#f8fafc",
              minHeight: 48,
              maxHeight: 120,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "#7c3aed"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{
              backgroundColor: input.trim() && !isLoading ? "#7c3aed" : "#e2e8f0",
              cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
            }}
          >
            {isLoading
              ? <Loader2 size={18} color="#94a3b8" className="animate-spin" />
              : <Send size={18} color={input.trim() ? "white" : "#94a3b8"} />
            }
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: "#94a3b8" }}>
          ИИ может ошибаться. Проверяйте важные решения самостоятельно.
        </p>
      </div>
    </div>
  );
}
