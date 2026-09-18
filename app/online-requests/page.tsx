"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { getBrowserAppContext } from "@/lib/browser-context";
import { rupiah, dateTime } from "@/lib/ui";
import {
  Bike,
  CheckCircle2,
  Clock3,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  Store,
  Truck,
  XCircle,
} from "lucide-react";

const labels: Record<string,string> = {
  new: "Baru",
  confirmed: "Dikonfirmasi",
  courier_on_the_way: "Kurir Jalan",
  picked_up: "Dijemput",
  arrived: "Tiba di Laundry",
  converted: "Jadi Order",
  cancelled: "Dibatalkan",
};

const colors: Record<string,string> = {
  new: "badge-info",
  confirmed: "badge-neutral",
  courier_on_the_way: "badge-warning",
  picked_up: "badge-warning",
  arrived: "badge-success",
  converted: "badge-success",
  cancelled: "badge-danger",
};

export default function OnlineRequestsPage() {
  const supabase = createClient();
  const [tenantId, setTenantId] = useState("");
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const ctx = await getBrowserAppContext();
    if (!ctx) return;
    setTenantId(ctx.tenantId);
    setRole(String(ctx.membership?.role || ""));
    let query = supabase
      .from("online_order_requests")
      .select("*,branches(name,phone),online_order_request_items(id,service_name,quantity,unit_label,estimated_subtotal)")
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false })
      .limit(150);
    if (status === "active") query = query.not("status", "in", '(converted,cancelled)');
    else if (status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    setLoading(false);
    if (error) return setMsg(error.message);
    setRows(data ?? []);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status]);

  async function setRequestStatus(id: string, next: string) {
    setMsg("");
    const { error } = await supabase.from("online_order_requests").update({ status: next }).eq("id", id).eq("tenant_id", tenantId);
    if (error) return setMsg(error.message);
    await load();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `${row.request_number} ${row.customer_name} ${row.customer_phone} ${row.branches?.name || ""}`.toLowerCase().includes(q));
  }, [rows, search]);

  const canConvert = ["owner","admin","manager","cashier"].includes(role);
  const activeCount = rows.filter((r) => !["converted","cancelled"].includes(r.status)).length;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="content-kicker"><Bike size={14}/> ONLINE REQUEST</div><h1 className="page-title mt-2">Order Online & Pickup</h1><p className="muted mt-1">Kelola request dari homepage sampai cucian dikonversi menjadi order kasir.</p></div><div className="theme-card theme-card-4 px-4 py-3"><div className="text-xs font-bold text-slate-500">Request aktif</div><div className="text-xl font-black">{activeCount}</div></div></div>

    {msg && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-600">{msg}</div>}

    <div className="premium-toolbar grid gap-3 p-3 md:grid-cols-[1fr_220px_auto]"><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input className="input pl-10" placeholder="Cari request, nama, WA, cabang..." value={search} onChange={(e) => setSearch(e.target.value)}/></div><select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Request Aktif</option><option value="all">Semua Status</option>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><button onClick={load} className="btn-secondary gap-2"><RefreshCw size={15}/> Refresh</button></div>

    {loading ? <div className="premium-empty">Memuat request online...</div> : <div className="grid gap-4 xl:grid-cols-2">{filtered.map((row, index) => <article key={row.id} className={`theme-card theme-card-${(index%8)+1} p-5`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><div className="text-xl font-black">{row.request_number}</div><span className={colors[row.status] || "badge-neutral"}>{labels[row.status] || row.status}</span><span className="badge-neutral">{row.request_type === "pickup" ? "Pickup" : "Drop-off"}</span></div><div className="mt-1 text-sm text-slate-500">{row.customer_name} • {row.customer_phone}</div><div className="text-xs text-slate-400">{row.branches?.name} • {dateTime(row.created_at)}</div></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/65 text-[var(--brand-primary)]">{row.request_type === "pickup" ? <Bike size={20}/> : <Store size={20}/>}</div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/55 p-3"><div className="text-xs font-bold uppercase text-slate-400">Estimasi</div><div className="mt-1 font-black">{Number(row.estimated_amount||0)>0?rupiah(row.estimated_amount):"Konfirmasi kasir"}</div><div className="text-xs text-slate-500">Bayar awal {rupiah(row.payment_due_now||0)}</div></div><div className="rounded-2xl bg-white/55 p-3"><div className="text-xs font-bold uppercase text-slate-400">Jadwal</div><div className="mt-1 font-black">{row.requested_at?dateTime(row.requested_at):"Fleksibel"}</div><div className="text-xs text-slate-500">{row.payment_preference?.replace(/_/g," ")}</div></div></div>
      {row.address && <div className="mt-3 rounded-2xl bg-white/55 p-3 text-sm text-slate-600"><MapPin size={14} className="mr-1 inline"/>{row.address}</div>}
      {row.notes && <div className="mt-3 text-sm text-slate-500">Catatan: {row.notes}</div>}
      {!!row.online_order_request_items?.length && <div className="mt-4 space-y-2">{row.online_order_request_items.map((item:any)=><div key={item.id} className="flex justify-between gap-3 rounded-2xl bg-white/50 p-3 text-sm"><div><b>{item.service_name}</b><div className="text-xs text-slate-500">{item.quantity} {item.unit_label}</div></div><b>{Number(item.estimated_subtotal||0)>0?rupiah(item.estimated_subtotal):"-"}</b></div>)}</div>}
      <div className="mt-5 flex flex-wrap gap-2">{row.status === "new" && <button onClick={() => setRequestStatus(row.id,"confirmed")} className="btn-secondary gap-2 !py-2 text-sm"><CheckCircle2 size={15}/> Konfirmasi</button>}{row.request_type === "pickup" && row.status === "confirmed" && <button onClick={() => setRequestStatus(row.id,"courier_on_the_way")} className="btn-secondary gap-2 !py-2 text-sm"><Truck size={15}/> Kurir Jalan</button>}{row.request_type === "pickup" && row.status === "courier_on_the_way" && <button onClick={() => setRequestStatus(row.id,"picked_up")} className="btn-secondary gap-2 !py-2 text-sm"><Bike size={15}/> Sudah Dijemput</button>}{["confirmed","picked_up"].includes(row.status) && <button onClick={() => setRequestStatus(row.id,"arrived")} className="btn-secondary gap-2 !py-2 text-sm"><PackageCheck size={15}/> Tiba di Laundry</button>}{canConvert && !["converted","cancelled"].includes(row.status) && <Link href={`/orders/new?request=${row.id}`} className="btn-primary gap-2 !py-2 text-sm"><PackageCheck size={15}/> Buat Order Kasir</Link>}{!["converted","cancelled"].includes(row.status) && <button onClick={() => setRequestStatus(row.id,"cancelled")} className="btn-danger gap-2 !py-2 text-sm"><XCircle size={15}/> Batal</button>}{row.converted_order_id && <Link href={`/orders/${row.converted_order_id}`} className="btn-secondary gap-2 !py-2 text-sm"><Clock3 size={15}/> Buka Order</Link>}<Link href={`/track/${row.public_token}`} target="_blank" className="btn-secondary !py-2 text-sm">Tracking</Link></div>
    </article>)}{!filtered.length && <div className="premium-empty xl:col-span-2">Belum ada request sesuai filter.</div>}</div>}
  </div>;
}
