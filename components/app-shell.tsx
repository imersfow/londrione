"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  LayoutDashboard, ShoppingBag, Users, Sparkles, GitBranch, WalletCards,
  Bell, Settings, LogOut, Menu, X, PlusCircle, Shirt, ChevronRight
} from "lucide-react";
import { useState } from "react";

const items = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/orders", "Order", ShoppingBag],
  ["/production", "Produksi", Shirt],
  ["/customers", "Pelanggan", Users],
  ["/services", "Layanan", Sparkles],
  ["/branches", "Cabang", GitBranch],
  ["/expenses", "Pengeluaran", WalletCards],
  ["/notifications", "Notifikasi", Bell],
  ["/settings", "Pengaturan", Settings],
] as const;

const mobileItems = items.slice(0, 5);

export function AppShell({ children, tenantName, role }: { children: React.ReactNode; tenantName: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login"); router.refresh();
  }

  function active(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
  }

  const sidebar = (
    <div className="flex h-full flex-col p-4">
      <div className="mb-5 rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-sky-500 p-5 text-white shadow-xl shadow-violet-200/50">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 text-xl font-black">L</div><div><div className="text-xl font-black">LondriOne</div><div className="text-[10px] uppercase tracking-[.18em] text-white/70">Laundry OS</div></div></div>
        <div className="mt-4 text-xs leading-5 text-white/80">The Operating System for Modern Laundry Business.</div>
      </div>
      <div className="mb-4 rounded-2xl border border-slate-200/70 bg-gradient-to-r from-slate-50 to-white px-3 py-3">
        <div className="truncate text-sm font-bold">{tenantName}</div><div className="mt-0.5 text-xs capitalize text-slate-500">Akses: {role}</div>
      </div>
      <nav className="space-y-1">
        {items.map(([href, label, Icon]) => (
          <Link key={href} href={href} onClick={() => setOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active(href) ? "bg-gradient-to-r from-violet-600 to-sky-500 text-white shadow" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}>
            <Icon size={18} /><span className="flex-1">{label}</span><ChevronRight size={14} className={active(href) ? "opacity-70" : "opacity-0 transition group-hover:opacity-50"}/>
          </Link>
        ))}
      </nav>
      <button onClick={logout} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"><LogOut size={18}/> Keluar</button>
    </div>
  );

  return <div className="min-h-screen pb-20 lg:pb-0">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/70 bg-white/75 backdrop-blur-xl lg:block">{sidebar}</aside>
    {open && <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}/>} 
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}><button className="absolute right-3 top-3 rounded-lg p-2 hover:bg-slate-100" onClick={() => setOpen(false)}><X size={20}/></button>{sidebar}</aside>
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3"><button className="rounded-xl border border-slate-200 bg-white p-2 lg:hidden" onClick={() => setOpen(true)}><Menu size={20}/></button><div><div className="font-bold text-slate-900">{tenantName}</div><div className="hidden text-xs text-slate-500 sm:block">Operasional laundry real-time</div></div></div>
        <Link href="/orders/new" className="btn-primary gap-2"><PlusCircle size={18}/> <span className="hidden sm:inline">Order Baru</span><span className="sm:hidden">Order</span></Link>
      </header>
      <main className="p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
    <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-xl backdrop-blur-xl lg:hidden">
      {mobileItems.map(([href,label,Icon])=><Link key={href} href={href} className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold ${active(href)?"bg-gradient-to-r from-violet-600 to-sky-500 text-white":"text-slate-500"}`}><Icon size={18}/><span>{label}</span></Link>)}
    </nav>
  </div>;
}
