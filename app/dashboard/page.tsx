import Link from "next/link";
import { getAppContext } from "@/lib/context";
import { rupiah, statusClass, statusLabel } from "@/lib/ui";
import { Banknote, PackageCheck, Clock3, Users, TriangleAlert, ArrowUpRight, GitBranch, WalletCards } from "lucide-react";

export default async function DashboardPage() {
  const { supabase, tenantId, branches } = await getAppContext();
  const branchIds = branches.map((b:any)=>b.id);
  const today = new Date(); today.setHours(0,0,0,0);
  const seven = new Date(today); seven.setDate(seven.getDate()-6);
  const safeIds=branchIds.length?branchIds:["00000000-0000-0000-0000-000000000000"];
  const [todayRes, recentRes, customersRes, expensesRes] = await Promise.all([
    supabase.from("orders").select("id,status,grand_total,paid_amount,balance_due,promised_at,branch_id,created_at").eq("tenant_id",tenantId).in("branch_id",safeIds).gte("created_at",today.toISOString()).is("deleted_at",null),
    supabase.from("orders").select("id,order_number,customer_name,status,payment_status,grand_total,branch_id,created_at,branches(name)").eq("tenant_id",tenantId).in("branch_id",safeIds).gte("created_at",seven.toISOString()).is("deleted_at",null).order("created_at",{ascending:false}).limit(8),
    supabase.from("customers").select("id",{count:"exact",head:true}).eq("tenant_id",tenantId).is("deleted_at",null),
    supabase.from("expenses").select("amount").eq("tenant_id",tenantId).in("branch_id",safeIds).eq("status","posted").gte("expense_date",today.toISOString().slice(0,10)).is("deleted_at",null),
  ]);
  const orders=todayRes.data??[]; const omzet=orders.reduce((s:any,o:any)=>s+Number(o.paid_amount||0),0); const outstanding=orders.reduce((s:any,o:any)=>s+Number(o.balance_due||0),0); const ready=orders.filter((o:any)=>o.status==="ready").length; const process=orders.filter((o:any)=>!["ready","completed","cancelled"].includes(o.status)).length; const expenses=(expensesRes.data??[]).reduce((s:any,o:any)=>s+Number(o.amount||0),0);
  const overdue=orders.filter((o:any)=>o.promised_at && new Date(o.promised_at)<new Date() && !["ready","completed","cancelled"].includes(o.status)).length;
  const cards=[
    ["Omzet Hari Ini",rupiah(omzet),Banknote,"from-violet-500 to-fuchsia-500"],
    ["Order Hari Ini",String(orders.length),PackageCheck,"from-sky-500 to-cyan-500"],
    ["Sedang Diproses",String(process),Clock3,"from-amber-500 to-orange-500"],
    ["Total Pelanggan",String(customersRes.count??0),Users,"from-emerald-500 to-teal-500"],
  ] as const;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="page-title">Owner Command Center</h1><p className="muted mt-1">Ringkasan operasional semua cabang hari ini.</p></div><Link href="/orders/new" className="btn-primary gap-2">Buat Order <ArrowUpRight size={16}/></Link></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon,grad])=><div key={label} className="card overflow-hidden p-5"><div className={`mb-4 inline-flex rounded-2xl bg-gradient-to-br ${grad} p-3 text-white shadow`}><Icon size={21}/></div><div className="text-2xl font-black">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>)}</div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="card-emerald p-4"><div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Siap diambil</div><div className="mt-2 text-3xl font-black">{ready}</div></div><div className="card-amber p-4"><div className="text-xs font-bold uppercase tracking-wider text-amber-600">Lewat estimasi</div><div className="mt-2 flex items-center gap-2 text-3xl font-black">{overdue}{overdue>0&&<TriangleAlert className="text-amber-500"/>}</div></div><div className="card p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Piutang hari ini</div><div className="mt-2 text-2xl font-black">{rupiah(outstanding)}</div></div><div className="card p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Pengeluaran hari ini</div><div className="mt-2 flex items-center gap-2 text-2xl font-black"><WalletCards size={21}/>{rupiah(expenses)}</div></div></div>
    <div className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]"><div className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="section-title">Order Terbaru</h2><p className="muted">Aktivitas 7 hari terakhir.</p></div><Link href="/orders" className="text-sm font-bold text-violet-600">Lihat semua</Link></div><div className="divide-y divide-slate-100">{(recentRes.data??[]).map((r:any)=><Link key={r.id} href={`/orders/${r.id}`} className="flex items-center gap-3 p-4 transition hover:bg-slate-50"><div className="min-w-0 flex-1"><div className="truncate font-bold">{r.order_number} · {r.customer_name}</div><div className="text-xs text-slate-500">{r.branches?.name||"-"}</div></div><span className={statusClass(r.status)}>{statusLabel[r.status]||r.status}</span><div className="hidden font-bold sm:block">{rupiah(r.grand_total)}</div></Link>)}{!(recentRes.data??[]).length&&<div className="p-8 text-center text-sm text-slate-400">Belum ada order.</div>}</div></div>
    <div className="card p-5"><div className="mb-4 flex items-center gap-2"><GitBranch size={19} className="text-violet-600"/><h2 className="section-title">Cabang Aktif</h2></div><div className="space-y-2">{branches.map((b:any)=><div key={b.id} className="rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3"><div className="font-bold">{b.name}</div><div className="text-xs text-slate-500">{b.code||"Tanpa kode"}{b.is_main?" • Cabang utama":""}</div></div>)}</div></div></div>
  </div>;
}
