"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { clearBrowserAppContext } from "@/lib/browser-context";
import { themeCssVars, type ThemeConfig } from "@/lib/theme";
import {
  LayoutDashboard, ShoppingBag, Users, Sparkles, GitBranch, WalletCards,
  Bell, Settings, LogOut, Menu, X, PlusCircle, Shirt, ChevronRight, UserCog, Globe2, Bike, Clock3, BarChart3, BookOpenCheck, MoreHorizontal
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PwaInstallButton } from "@/components/pwa-install-button";

const items = [
  { href:"/dashboard", label:"Dashboard", icon:LayoutDashboard, roles:["owner","admin","manager","cashier","production","courier"] },
  { href:"/orders", label:"Order", icon:ShoppingBag, roles:["owner","admin","manager","cashier","production","courier"] },
  { href:"/online-requests", label:"Order Online", icon:Bike, roles:["owner","admin","manager","cashier","courier"] },
  { href:"/production", label:"Produksi", icon:Shirt, roles:["owner","admin","manager","production"] },
  { href:"/customers", label:"Pelanggan", icon:Users, roles:["owner","admin","manager","cashier"] },
  { href:"/services", label:"Layanan", icon:Sparkles, roles:["owner","admin","manager"] },
  { href:"/branches", label:"Cabang", icon:GitBranch, roles:["owner","admin"] },
  { href:"/expenses", label:"Pengeluaran", icon:WalletCards, roles:["owner","admin","manager"] },
  { href:"/shifts", label:"Shift Kasir", icon:Clock3, roles:["owner","admin","manager","cashier"] },
  { href:"/reports", label:"Laporan", icon:BarChart3, roles:["owner","admin","manager"] },
  { href:"/staff", label:"Staff & Akses", icon:UserCog, roles:["owner","admin"] },
  { href:"/notifications", label:"Notifikasi", icon:Bell, roles:["owner","admin"] },
  { href:"/homepage", label:"Homepage", icon:Globe2, roles:["owner","admin"] },
  { href:"/guide", label:"Panduan", icon:BookOpenCheck, roles:["owner","admin","manager","cashier","production","courier"] },
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
  const [moreOpen, setMoreOpen] = useState(false);
  const supabase = createClient();
  const visibleItems = useMemo(
    () => items.filter((item)=>(item.roles as readonly string[]).includes(role)),
    [role]
  );
  const preferredMobile = ["/dashboard","/orders","/production","/customers"];
  const mobileItems = preferredMobile.map((href)=>visibleItems.find((item)=>item.href===href)).filter(Boolean) as typeof visibleItems;
  const moreItems = visibleItems.filter((item)=>!mobileItems.some((mobile)=>mobile.href===item.href));
  const canCreateOrder = ["owner","admin","manager","cashier"].includes(role);

  useEffect(() => {
    visibleItems.forEach((item) => router.prefetch(item.href));
    if (canCreateOrder) router.prefetch("/orders/new");
  }, [router, visibleItems, canCreateOrder]);

  async function logout() {
    clearBrowserAppContext();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
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
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
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
      <button onClick={logout} className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"><LogOut size={18}/> Keluar</button>
    </div>
  );

  return <div className="app-theme min-h-screen pb-20 lg:pb-0" style={themeCssVars(theme)}>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/70 bg-white/70 backdrop-blur-xl lg:block">{sidebar}</aside>
    {open && <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}/>} 
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}><button className="absolute right-3 top-3 rounded-lg p-2 hover:bg-slate-100" onClick={() => setOpen(false)}><X size={20}/></button>{sidebar}</aside>
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/70 bg-white/75 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3"><button className="rounded-xl border border-slate-200 bg-white p-2 lg:hidden" onClick={() => setOpen(true)}><Menu size={20}/></button><div><div className="font-bold text-slate-900">{tenantName}</div><div className="hidden text-xs text-slate-500 sm:block">Operasional laundry real-time</div></div></div>
        <div className="flex items-center gap-2"><PwaInstallButton compact/>{canCreateOrder && <Link href="/orders/new" className="btn-primary gap-2"><PlusCircle size={18}/> <span className="hidden sm:inline">Order Baru</span><span className="sm:hidden">Order</span></Link>}</div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
    {moreOpen && <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={()=>setMoreOpen(false)} />}
    <div className={`fixed inset-x-3 bottom-24 z-50 rounded-3xl border border-white/80 bg-white/95 p-3 shadow-2xl backdrop-blur-xl transition lg:hidden ${moreOpen?"translate-y-0 opacity-100":"pointer-events-none translate-y-5 opacity-0"}`}>
      <div className="grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">{moreItems.map(({href,label,icon:Icon})=>{const isActive=active(href);return <Link key={href} href={href} onClick={()=>setMoreOpen(false)} className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold ${isActive?"text-white":"border-slate-100 bg-slate-50 text-slate-600"}`} style={isActive?{backgroundImage:"linear-gradient(90deg,var(--brand-primary),var(--brand-secondary))"}:undefined}><Icon size={18}/><span>{label}</span></Link>})}</div>
    </div>
    <nav className="fixed inset-x-3 bottom-3 z-30 grid rounded-2xl border border-white/80 bg-white/92 p-1.5 shadow-xl backdrop-blur-xl lg:hidden" style={{gridTemplateColumns:`repeat(${mobileItems.length+1},minmax(0,1fr))`}}>
      {mobileItems.map(({href,label,icon:Icon})=>{const isActive=active(href);return <Link key={href} href={href} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold ${isActive?"text-white":"text-slate-500"}`} style={isActive?{backgroundImage:"linear-gradient(90deg,var(--brand-primary),var(--brand-secondary))"}:undefined}><Icon size={18}/><span className="max-w-full truncate">{label}</span></Link>})}
      <button onClick={()=>setMoreOpen(value=>!value)} className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold ${moreOpen?"text-white":"text-slate-500"}`} style={moreOpen?{backgroundImage:"linear-gradient(90deg,var(--brand-primary),var(--brand-secondary))"}:undefined}><MoreHorizontal size={18}/><span>Lainnya</span></button>
    </nav>
  </div>;
}
