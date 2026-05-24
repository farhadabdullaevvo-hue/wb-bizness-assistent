"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  CheckSquare,
  Bot,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Settings,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",   label: "Дашборд",       icon: LayoutDashboard },
  { href: "/products",    label: "Товары",         icon: Package },
  { href: "/tasks",       label: "Задачи",         icon: CheckSquare },
  { href: "/assistant",   label: "ИИ-ассистент",   icon: Bot },
  { href: "/plans",       label: "Планы продаж",   icon: TrendingUp },
  { href: "/costs",       label: "Расходы",        icon: Receipt },
  { href: "/procurement", label: "Закупки",        icon: ShoppingCart },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-full w-64 flex flex-col z-20"
      style={{ backgroundColor: "#0f172a" }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "#7c3aed" }}>
          <Zap size={16} color="white" fill="white" />
        </div>
        <div>
          <div className="text-white font-semibold text-sm leading-tight">WB Ассистент</div>
          <div className="text-xs" style={{ color: "#64748b" }}>AI Бизнес-помощник</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                backgroundColor: isActive ? "#7c3aed" : "transparent",
                color: isActive ? "white" : "#94a3b8",
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLElement).style.color = "white";
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                }
              }}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom settings */}
      <div className="px-3 py-4 border-t border-white/10">
        <Link href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ color: "#64748b" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "white";
            (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = "#64748b";
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
          }}
        >
          <Settings size={18} />
          Настройки
        </Link>
      </div>
    </aside>
  );
}
