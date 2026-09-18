"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  LayoutDashboard, ShoppingBag, Users, Sparkles, GitBranch,
  WalletCards, Bell, Settings, LogOut, Menu, X, PlusCircle
} from "lucide-react";
import { useState } from "react";

const items = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/orders", "Order", ShoppingBag],
  ["/customers", "Pelanggan", Users],
  ["/services", "Layanan", Sparkles],
  ["/branches", "Cabang", GitBranch],
  ["/expenses", "Pengeluaran", WalletCards],
  ["/notifications", "Notifikasi", Bell],
  ["/settings", "Pengaturan", Settings],
] as const;

export function AppShell({ children, tenantName, role }: { children: React.ReactNode; tenantName: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col p-4">
      <div className="mb-5 rounded-2xl bg-gradient-to-br from-violet-600 to-sky-500 p-4 text-white shadow-lg">
        <div className="text-xl font-black">LondriOne</div>
        <div className="mt-1 text-xs text-white/80">The Operating System for Modern Laundry Business.</div>
      </div>
      <div className="mb-4 rounded-xl bg-slate-100/80 px-3 py-2">
        <div className="truncate text-sm font-semibold">{tenantName}</div>
        <div className="text-xs capitalize text-slate-500">{role}</div>
      </div>
      <nav className="space-y-1">
        {items.map(([href, label, Icon]) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-gradient-to-r from-violet-600 to-sky-500 text-white shadow" : "text-slate-600 hover:bg-white"}`}>
              <Icon size={18} /> {label}
            </Link>
          );
        })}
      </nav>
      <button onClick={logout} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50">
        <LogOut size={18} /> Keluar
      </button>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/70 bg-white/75 backdrop-blur-xl lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <button className="absolute right-3 top-3 rounded-lg p-2 hover:bg-slate-100" onClick={() => setOpen(false)}><X size={20} /></button>
        {sidebar}
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/75 px-4 backdrop-blur-xl sm:px-6">
          <button className="rounded-xl border border-slate-200 bg-white p-2 lg:hidden" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <div className="hidden sm:block">
            <div className="font-bold text-slate-900">{tenantName}</div>
            <div className="text-xs text-slate-500">Operasional laundry hari ini</div>
          </div>
          <Link href="/orders/new" className="btn-primary gap-2"><PlusCircle size={18} /> Order Baru</Link>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
