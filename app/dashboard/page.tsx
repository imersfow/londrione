"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserAppContext } from "@/lib/browser-context";
import { rupiah, statusClass, statusLabel } from "@/lib/ui";
import { Banknote, PackageCheck, Clock3, Users, TriangleAlert, ArrowUpRight, GitBranch, WalletCards } from "lucide-react";

type DashboardState = {
  loading: boolean;
  omzet: number;
  orderCount: number;
  process: number;
  customerCount: number;
  ready: number;
  overdue: number;
  outstanding: number;
  expenses: number;
  recent: any[];
  branches: any[];
};

const initialState: DashboardState = {
  loading: true,
  omzet: 0,
  orderCount: 0,
  process: 0,
  customerCount: 0,
  ready: 0,
  overdue: 0,
  outstanding: 0,
  expenses: 0,
  recent: [],
  branches: [],
};

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>(initialState);

  useEffect(() => {
    let active = true;

    (async () => {
      const ctx = await getBrowserAppContext();
      if (!ctx || !active) return;

      const { supabase, tenantId, branches } = ctx;
      const branchIds = branches.map((b: any) => b.id);
      const safeIds = branchIds.length ? branchIds : ["00000000-0000-0000-0000-000000000000"];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const seven = new Date(today);
      seven.setDate(seven.getDate() - 6);

      const [todayRes, recentRes, customersRes, expensesRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id,status,grand_total,paid_amount,balance_due,promised_at,branch_id,created_at")
          .eq("tenant_id", tenantId)
          .in("branch_id", safeIds)
          .gte("created_at", today.toISOString())
          .is("deleted_at", null),
        supabase
          .from("orders")
          .select("id,order_number,customer_name,status,payment_status,grand_total,branch_id,created_at,branches(name)")
          .eq("tenant_id", tenantId)
          .in("branch_id", safeIds)
          .gte("created_at", seven.toISOString())
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("deleted_at", null),
        supabase
          .from("expenses")
          .select("amount")
          .eq("tenant_id", tenantId)
          .in("branch_id", safeIds)
          .eq("status", "posted")
          .gte("expense_date", today.toISOString().slice(0, 10))
          .is("deleted_at", null),
      ]);

      if (!active) return;

      const orders = todayRes.data ?? [];
      const omzet = orders.reduce((sum: number, order: any) => sum + Number(order.paid_amount || 0), 0);
      const outstanding = orders.reduce((sum: number, order: any) => sum + Number(order.balance_due || 0), 0);
      const ready = orders.filter((order: any) => order.status === "ready").length;
      const process = orders.filter((order: any) => !["ready", "completed", "cancelled"].includes(order.status)).length;
      const expenses = (expensesRes.data ?? []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
      const overdue = orders.filter(
        (order: any) =>
          order.promised_at &&
          new Date(order.promised_at) < new Date() &&
          !["ready", "completed", "cancelled"].includes(order.status)
      ).length;

      setState({
        loading: false,
        omzet,
        orderCount: orders.length,
        process,
        customerCount: customersRes.count ?? 0,
        ready,
        overdue,
        outstanding,
        expenses,
        recent: recentRes.data ?? [],
        branches,
      });
    })();

    return () => {
      active = false;
    };
  }, []);

  const cards = [
    ["Omzet Hari Ini", rupiah(state.omzet), Banknote, "from-violet-500 to-fuchsia-500", 1],
    ["Order Hari Ini", String(state.orderCount), PackageCheck, "from-sky-500 to-cyan-500", 2],
    ["Sedang Diproses", String(state.process), Clock3, "from-amber-500 to-orange-500", 3],
    ["Total Pelanggan", String(state.customerCount), Users, "from-emerald-500 to-teal-500", 4],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Owner Command Center</h1>
          <p className="muted mt-1">Ringkasan operasional semua cabang hari ini.</p>
        </div>
        <Link href="/orders/new" className="btn-primary gap-2">
          Buat Order <ArrowUpRight size={16} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon, grad, index]) => (
          <div key={label} className={`theme-card theme-card-${index} overflow-hidden p-5`}>
            <div className={`mb-4 inline-flex rounded-2xl bg-gradient-to-br ${grad} p-3 text-white shadow-sm`}>
              <Icon size={21} />
            </div>
            <div className="text-2xl font-black">{state.loading ? "…" : value}</div>
            <div className="mt-1 text-sm text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="theme-card theme-card-5 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Siap diambil</div>
          <div className="mt-2 text-3xl font-black">{state.loading ? "…" : state.ready}</div>
        </div>
        <div className="theme-card theme-card-6 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Lewat estimasi</div>
          <div className="mt-2 flex items-center gap-2 text-3xl font-black">
            {state.loading ? "…" : state.overdue}
            {!state.loading && state.overdue > 0 && <TriangleAlert className="text-amber-500" />}
          </div>
        </div>
        <div className="theme-card theme-card-7 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">Piutang hari ini</div>
          <div className="mt-2 text-2xl font-black">{state.loading ? "…" : rupiah(state.outstanding)}</div>
        </div>
        <div className="theme-card theme-card-8 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">Pengeluaran hari ini</div>
          <div className="mt-2 flex items-center gap-2 text-2xl font-black">
            <WalletCards size={21} />
            {state.loading ? "…" : rupiah(state.expenses)}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
        <div className="theme-card theme-card-1 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/70 p-5">
            <div>
              <h2 className="section-title">Order Terbaru</h2>
              <p className="muted">Aktivitas 7 hari terakhir.</p>
            </div>
            <Link href="/orders" className="brand-link text-sm font-bold">Lihat semua</Link>
          </div>
          <div className="divide-y divide-white/70">
            {state.recent.map((row: any) => (
              <Link key={row.id} href={`/orders/${row.id}`} className="flex items-center gap-3 p-4 transition hover:bg-white/45">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{row.order_number} · {row.customer_name}</div>
                  <div className="text-xs text-slate-500">{row.branches?.name || "-"}</div>
                </div>
                <span className={statusClass(row.status)}>{statusLabel[row.status] || row.status}</span>
                <div className="hidden font-bold sm:block">{rupiah(row.grand_total)}</div>
              </Link>
            ))}
            {!state.loading && !state.recent.length && <div className="p-8 text-center text-sm text-slate-400">Belum ada order.</div>}
            {state.loading && <div className="p-8 text-center text-sm text-slate-400">Memuat ringkasan...</div>}
          </div>
        </div>

        <div className="theme-card theme-card-2 p-5">
          <div className="mb-4 flex items-center gap-2">
            <GitBranch size={19} className="brand-text" />
            <h2 className="section-title">Cabang Aktif</h2>
          </div>
          <div className="space-y-2">
            {state.branches.map((branch: any) => (
              <div key={branch.id} className="rounded-2xl border border-white/80 bg-white/55 px-4 py-3 backdrop-blur">
                <div className="font-bold">{branch.name}</div>
                <div className="text-xs text-slate-500">{branch.code || "Tanpa kode"}{branch.is_main ? " • Cabang utama" : ""}</div>
              </div>
            ))}
            {state.loading && <div className="text-sm text-slate-400">Memuat cabang...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
