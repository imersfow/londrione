"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { themeCssVars, type ThemeConfig } from "@/lib/theme";
import {
  LayoutDashboard, ShoppingBag, Users, Sparkles, GitBranch, WalletCards,
  Bell, Settings, LogOut, Menu, X, PlusCircle, Shirt, ChevronRight, UserCog
} from "lucide-react";
import { useState } from "react";

const items = [
  { href:"/dashboard", label:"Dashboard", icon:LayoutDashboard, roles:["owner","admin","manager","cashier","production","courier"] },
  { href:"/orders", label:"Order", icon:ShoppingBag, roles:["owner","admin","manager","cashier","production","courier"] },
  { href:"/production", label:"Produksi", icon:Shirt, roles:["owner","admin","manager","production"] },
  { href:"/customers", label:"Pelanggan", icon:Users, roles:["owner","admin","manager","cashier"] },
  { href:"/services", label:"Layanan", icon:Sparkles, roles:["owner","admin","manager"] },
  { href:"/branches", label:"Cabang", icon:GitBranch, roles:["owner","admin"] },
  { href:"/expenses", label:"Pengeluaran", icon:WalletCards, roles:["owner","admin","manager"] },
  { href:"/staff", label:"Staff & Akses", icon:UserCog, roles:["owner","admin"] },
  { href:"/notifications", label:"Notifikasi", icon:Bell, roles:["owner","admin"] },
  { href:"/settings", label:"Pengaturan", icon:Settings, roles:["owner","admin"] },
] as const;

export function AppShell({ children, tenantName, appName, appTagline, logoUrl, role, theme }: {
  children: React.ReactNode;
  tenantName: string;
  appName: string;
  appTagline: string;
  logoUrl: string | null;
  role: string;
  theme: ThemeConfig;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = createClient();
  const visibleItems = items.filter((item)=>(item.roles as readonly string[]).includes(role));
  const mobileItems = visibleItems.slice(0,5);
  const canCreateOrder = ["owner","admin","manager","cashier"].includes(role);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login"); router.refresh();
  }

  function active(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
  }

  const sidebar = (
    <div className="flex h-full flex-col p-4">
      <div
        className="mb-5 rounded-3xl p-5 text-white shadow-xl"
        style={{ backgroundImage: "linear-gradient(135deg,var(--sidebar-from),var(--sidebar-to))" }}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/20 text-xl font-black">
            {logoUrl ? <img src={logoUrl} alt={appName} className="h-full w-full object-cover" /> : (appName.trim().charAt(0).toUpperCase() || "L")}
          </div>
          <div className="min-w-0"><div className="truncate text-xl font-black">{appName}</div><div className="text-[10px] uppercase tracking-[.18em] text-white/70">Laundry OS</div></div>
        </div>
        <div className="mt-4 text-xs leading-5 text-white/80">{appTagline}</div>
      </div>
      <div className="theme-card theme-card-7 mb-4 px-3 py-3">
        <div className="truncate text-sm font-bold">{tenantName}</div><div className="mt-0.5 text-xs capitalize text-slate-500">Akses: {role}</div>
      </div>
      <nav className="space-y-1">
        {visibleItems.map(({href,label,icon:Icon}) => {
          const isActive = active(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "text-white shadow" : "text-slate-600 hover:bg-white/80 hover:text-slate-900"}`}
              style={isActive ? { backgroundImage: "linear-gradient(90deg,var(--brand-primary),var(--brand-secondary))" } : undefined}
            >
              <Icon size={18} /><span className="flex-1">{label}</span><ChevronRight size={14} className={isActive ? "opacity-70" : "opacity-0 transition group-hover:opacity-50"}/>
            </Link>
          );
        })}
      </nav>
      <button onClick={logout} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"><LogOut size={18}/> Keluar</button>
    </div>
  );

  return <div className="app-theme min-h-screen pb-20 lg:pb-0" style={themeCssVars(theme)}>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/70 bg-white/70 backdrop-blur-xl lg:block">{sidebar}</aside>
    {open && <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}/>} 
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}><button className="absolute right-3 top-3 rounded-lg p-2 hover:bg-slate-100" onClick={() => setOpen(false)}><X size={20}/></button>{sidebar}</aside>
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/70 bg-white/75 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3"><button className="rounded-xl border border-slate-200 bg-white p-2 lg:hidden" onClick={() => setOpen(true)}><Menu size={20}/></button><div><div className="font-bold text-slate-900">{tenantName}</div><div className="hidden text-xs text-slate-500 sm:block">Operasional laundry real-time</div></div></div>
        {canCreateOrder && <Link href="/orders/new" className="btn-primary gap-2"><PlusCircle size={18}/> <span className="hidden sm:inline">Order Baru</span><span className="sm:hidden">Order</span></Link>}
      </header>
      <main className="p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
    <nav className={`fixed inset-x-3 bottom-3 z-30 grid rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-xl backdrop-blur-xl lg:hidden ${mobileItems.length===4?"grid-cols-4":mobileItems.length===3?"grid-cols-3":"grid-cols-5"}`}>
      {mobileItems.map(({href,label,icon:Icon})=>{
        const isActive=active(href);
        return <Link key={href} href={href} className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold ${isActive?"text-white":"text-slate-500"}`} style={isActive?{backgroundImage:"linear-gradient(90deg,var(--brand-primary),var(--brand-secondary))"}:undefined}><Icon size={18}/><span>{label}</span></Link>;
      })}
    </nav>
  </div>;
}
