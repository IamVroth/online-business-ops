"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, Receipt, BarChart3, Users, Settings, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type UserRole = "admin" | "manager" | "staff" | "report_viewer";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, tint: "bg-blue-50 text-blue-600", roles: ["admin", "manager", "staff", "report_viewer"] },
  { href: "/sales", label: "Sales", icon: ShoppingCart, tint: "bg-emerald-50 text-emerald-600", roles: ["admin", "manager", "staff"] },
  { href: "/products", label: "Products", icon: Package, tint: "bg-amber-50 text-amber-600", roles: ["admin", "manager", "staff"] },
  { href: "/expenses", label: "Expenses", icon: Receipt, tint: "bg-rose-50 text-rose-600", roles: ["admin", "manager", "staff"] },
  { href: "/facebook", label: "Social Media Report", icon: BarChart3, tint: "bg-indigo-50 text-indigo-600", roles: ["admin", "manager", "staff", "report_viewer"] },
  { href: "/settings/users", label: "Users", icon: Users, tint: "bg-purple-50 text-purple-600", roles: ["admin"] },
  { href: "/settings/categories", label: "Categories", icon: Settings, tint: "bg-slate-100 text-slate-600", roles: ["admin", "manager", "staff"] },
];

export function Sidebar({ role, userName }: { role: string; userName: string }) {
  const pathname = usePathname();
  const safeRole = (["admin", "manager", "staff", "report_viewer"].includes(role) ? role : "staff") as UserRole;
  const initials = userName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const roleLabel = safeRole === "report_viewer" ? "Report viewer" : safeRole;
  const visibleItems = items.filter((i) => i.roles.includes(safeRole));
  return (
    <>
    <div className="md:hidden sticky top-0 z-40 -mx-3 mb-4 border-b border-white/70 bg-background/95 px-3 py-3 backdrop-blur">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">B</div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold leading-tight">Business Ops</h1>
          <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{userName} · {roleLabel}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>

    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-card rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] p-4 h-[calc(100vh-2rem)] sticky top-4">
      {/* Brand */}
      <div className="flex items-center gap-2 px-2 py-2 mb-4">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">B</div>
        <div>
          <h1 className="text-base font-bold leading-tight">Business Ops</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{roleLabel}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <span className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                active ? "bg-white/10 text-white" : item.tint
              )}>
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Promo card */}
      <div className="mt-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 text-white relative overflow-hidden">
        <Sparkles className="h-5 w-5 mb-2" />
        <p className="text-sm font-semibold leading-tight">Ops assistant</p>
        <p className="text-[11px] opacity-90 mt-1 leading-snug">Tips &amp; automation to help you close the month faster.</p>
      </div>

      {/* Account row */}
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-2">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">{initials || "U"}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{userName}</p>
          <p className="text-[10px] text-muted-foreground truncate">Signed in</p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-slate-900" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
    <nav className="md:hidden fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur">
      <div className="flex gap-1 overflow-x-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition-all",
                active ? "bg-slate-900 text-white" : "text-slate-600"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-[64px] truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
