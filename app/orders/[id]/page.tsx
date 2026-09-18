"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { rupiah, statusClass, statusLabel, dateTime } from "@/lib/ui";
import { Banknote, Clock3, MapPin, Printer, Shirt, Truck, UserRound } from "lucide-react";

const statuses = ["received","washing","drying","ironing","ready","out_for_delivery","completed","cancelled"];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [ref, setRef] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const { data: orderData } = await supabase.from("orders").select("*,branches(name,address,phone,email,city,province)").eq("id", id).single();
    setOrder(orderData);
    const [{ data: itemData }, { data: paymentData }, { data: historyData }] = await Promise.all([
      supabase.from("order_items").select("*").eq("order_id", id).is("deleted_at", null).order("created_at"),
      supabase.from("payments").select("*").eq("order_id", id).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    ]);
    setItems(itemData ?? []);
    setPayments(paymentData ?? []);
    setHistory(historyData ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setStatus(value: string) {
    setMsg("");
    const { error } = await supabase.rpc("update_order_status", { p_order_id: id, p_status: value });
    if (error) setMsg(error.message);
    await load();
  }

  async function pay(e: FormEvent) {
    e.preventDefault();
    if (!order) return;
    setMsg("");
    const value = Number(amount || 0);
    if (value <= 0) return setMsg("Nominal pembayaran harus lebih dari 0.");
    if (value > Number(order.balance_due || 0)) return setMsg("Nominal pembayaran melebihi sisa tagihan.");
    const { error } = await supabase.from("payments").insert({
      tenant_id: order.tenant_id,
      branch_id: order.branch_id,
      order_id: id,
      amount: value,
      payment_method: method,
      status: "verified",
      transaction_ref: ref.trim() || null,
      verified_at: new Date().toISOString(),
    });
    if (error) return setMsg(error.message);
    setAmount("");
    setRef("");
    await load();
  }

  if (!order) return <div className="muted">Memuat order...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="flex flex-wrap items-center gap-2"><h1 className="page-title">{order.order_number}</h1><span className={statusClass(order.status)}>{statusLabel[order.status] || order.status}</span><span className={statusClass(order.payment_status)}>{statusLabel[order.payment_status] || order.payment_status}</span></div><p className="muted mt-1">{order.customer_name} • {order.branches?.name} • {String(order.order_type || "walk_in").replace(/_/g, " ")}</p></div>
        <div className="flex flex-wrap gap-2">{order?.tracking_token && <Link href={`/track/${order.tracking_token}`} target="_blank" className="btn-primary gap-2"><Clock3 size={16}/> Tracking Customer</Link>}<Link href={`/orders/${id}/receipt`} className="btn-secondary gap-2"><Printer size={16}/> Struk / Print</Link></div>
      </div>

      {msg && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-600">{msg}</div>}

      <div className="grid gap-5 xl:grid-cols-[1fr_370px]">
        <div className="space-y-5">
          <section className="premium-panel p-5"><div className="premium-form-head flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Shirt size={18}/></div><div><h2 className="section-title">Proses Cucian</h2><p className="text-xs text-slate-500">Update status langsung masuk papan produksi dan histori.</p></div></div><div className="flex flex-wrap gap-2">{statuses.map((status) => <button key={status} onClick={() => setStatus(status)} className={`rounded-full px-3 py-2 text-xs font-bold transition ${order.status === status ? "text-white shadow" : "bg-white/65 text-slate-600 hover:bg-white"}`} style={order.status === status ? { backgroundImage: "linear-gradient(90deg,var(--brand-primary),var(--brand-secondary))" } : undefined}>{statusLabel[status] || status}</button>)}</div></section>

          <section className="premium-panel overflow-hidden p-3"><div className="mb-2 px-2 pt-2 font-black">Item Laundry</div><div className="space-y-2">{items.map((item, index) => <div key={item.id} className={`theme-card theme-card-${(index % 8) + 1} flex justify-between gap-3 p-4 text-sm`}><div><div className="font-black">{item.item_name}</div><div className="text-slate-500">{item.quantity} {item.unit_label} × {rupiah(item.unit_price)}</div>{item.notes && <div className="mt-1 text-xs text-slate-400">{item.notes}</div>}</div><div className="font-black">{rupiah(item.line_total)}</div></div>)}</div></section>

          {(order.pickup_address || order.delivery_address || order.logistics_notes) && <section className="premium-panel p-5"><div className="premium-form-head flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Truck size={18}/></div><div><h2 className="section-title">Pickup / Delivery</h2><p className="text-xs text-slate-500">Informasi operasional kurir untuk order ini.</p></div></div><div className="grid gap-3 md:grid-cols-2">{order.pickup_address && <div className="theme-card theme-card-2 p-4"><div className="mb-1 flex items-center gap-2 text-sm font-black"><MapPin size={15}/> Alamat Pickup</div><div className="text-sm text-slate-600">{order.pickup_address}</div></div>}{order.delivery_address && <div className="theme-card theme-card-4 p-4"><div className="mb-1 flex items-center gap-2 text-sm font-black"><MapPin size={15}/> Alamat Delivery</div><div className="text-sm text-slate-600">{order.delivery_address}</div></div>}</div>{order.logistics_notes && <div className="mt-3 rounded-2xl bg-white/55 p-4 text-sm text-slate-600"><b>Catatan kurir:</b> {order.logistics_notes}</div>}</section>}

          <section className="premium-panel p-5"><div className="premium-form-head flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Clock3 size={18}/></div><div><h2 className="section-title">Riwayat Status</h2><p className="text-xs text-slate-500">Jejak proses order dari diterima sampai selesai.</p></div></div><div className="space-y-3">{history.map((row) => <div key={row.id} className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--brand-primary)]"/><div><div className="text-sm font-bold">{statusLabel[row.to_status] || row.to_status}</div><div className="text-xs text-slate-400">{dateTime(row.created_at)}</div></div></div>)}</div></section>
        </div>

        <div className="space-y-5">
          <section className="theme-card theme-card-1 p-5"><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Grand Total</div><div className="mt-1 text-3xl font-black">{rupiah(order.grand_total)}</div><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl bg-emerald-50/80 p-3"><span className="text-emerald-600">Dibayar</span><br/><b>{rupiah(order.paid_amount)}</b></div><div className="rounded-xl bg-amber-50/80 p-3"><span className="text-amber-600">Sisa</span><br/><b>{rupiah(order.balance_due)}</b></div></div>{Number(order.delivery_fee || 0) > 0 && <div className="mt-3 rounded-xl bg-white/55 p-3 text-sm"><span className="text-slate-500">Biaya antar/jemput</span><div className="font-black">{rupiah(order.delivery_fee)}</div></div>}</section>

          <section className="theme-card theme-card-7 p-5"><div className="flex items-center gap-2"><UserRound className="text-[var(--brand-primary)]"/><h2 className="section-title">Pelanggan</h2></div><div className="mt-3 font-bold">{order.customer_name}</div><div className="text-sm text-slate-500">{order.customer_phone || "Tanpa WA"}</div><div className="mt-3 text-xs text-slate-400">Masuk: {dateTime(order.received_at)}<br/>Estimasi: {dateTime(order.promised_at)}</div></section>

          {Number(order.balance_due || 0) > 0 && <form onSubmit={pay} className="premium-panel p-5"><div className="premium-form-head flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Banknote size={18}/></div><div><h2 className="section-title">Tambah Pembayaran</h2><p className="text-xs text-slate-500">Bisa cicil sampai status otomatis lunas.</p></div></div><div className="space-y-3"><input className="input" type="number" min="1" max={Math.max(Number(order.balance_due || 0), 1)} placeholder="Nominal" value={amount} onChange={(e) => setAmount(e.target.value)} required/><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}><option value="cash">Cash</option><option value="bank_transfer">Transfer</option><option value="qris">QRIS</option><option value="ewallet">E-Wallet</option><option value="other">Lainnya</option></select><input className="input" placeholder="Ref transaksi (opsional)" value={ref} onChange={(e) => setRef(e.target.value)}/><button className="btn-primary w-full">Catat Pembayaran</button></div></form>}

          <section className="premium-panel p-5"><h2 className="section-title">Riwayat Bayar</h2><div className="mt-3 space-y-2">{payments.map((payment, index) => <div key={payment.id} className={`theme-card theme-card-${(index % 8) + 1} p-3 text-sm`}><b>{rupiah(payment.amount)}</b><div className="text-xs text-slate-500">{payment.payment_method} • {payment.status} • {dateTime(payment.created_at)}</div></div>)}{!payments.length && <div className="text-sm text-slate-400">Belum ada pembayaran.</div>}</div></section>
        </div>
      </div>
    </div>
  );
}
