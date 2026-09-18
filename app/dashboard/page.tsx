import { getAppContext } from "@/lib/context";
import { Banknote, PackageCheck, Clock3, Users } from "lucide-react";

export default async function DashboardPage() {
  const { supabase, tenantId, branches } = await getAppContext();
  const branchIds = branches.map((b:any)=>b.id);
  const today = new Date(); today.setHours(0,0,0,0);
  const [ordersRes, customersRes] = await Promise.all([
    supabase.from("orders").select("id,status,grand_total,paid_amount,created_at").eq("tenant_id", tenantId).in("branch_id", branchIds.length ? branchIds : ["00000000-0000-0000-0000-000000000000"]).gte("created_at", today.toISOString()).is("deleted_at", null),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("deleted_at", null)
  ]);
  const orders = ordersRes.data ?? [];
  const omzet = orders.reduce((s:any,o:any)=>s+Number(o.paid_amount||0),0);
  const ready = orders.filter((o:any)=>o.status==="ready").length;
  const process = orders.filter((o:any)=>!["ready","completed","cancelled"].includes(o.status)).length;
  const cards = [
    ["Omzet Hari Ini", `Rp ${Math.round(omzet).toLocaleString("id-ID")}`, Banknote],
    ["Order Hari Ini", String(orders.length), PackageCheck],
    ["Sedang Diproses", String(process), Clock3],
    ["Total Pelanggan", String(customersRes.count ?? 0), Users],
  ] as const;
  return <div className="space-y-6">
    <div><h1 className="page-title">Dashboard</h1><p className="muted mt-1">Ringkasan bisnis laundry hari ini.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon])=><div key={label} className="card p-5"><div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-violet-100 to-sky-100 p-3 text-violet-700"><Icon size={22}/></div><div className="text-2xl font-black">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-2"><div className="card p-5"><h2 className="font-bold">Status Hari Ini</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-4"><div className="text-3xl font-black text-amber-700">{process}</div><div className="text-sm text-amber-700/70">Diproses</div></div><div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4"><div className="text-3xl font-black text-emerald-700">{ready}</div><div className="text-sm text-emerald-700/70">Siap diambil</div></div></div></div><div className="card p-5"><h2 className="font-bold">Cabang Aktif</h2><div className="mt-4 space-y-2">{branches.map((b:any)=><div key={b.id} className="rounded-xl bg-slate-50 px-4 py-3"><div className="font-semibold">{b.name}</div><div className="text-xs text-slate-500">{b.code || "Tanpa kode"}{b.is_main ? " • Cabang utama" : ""}</div></div>)}</div></div></div>
  </div>;
}
