"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { rupiah, dateTime } from "@/lib/ui";
import { ArrowLeft, Printer } from "lucide-react";

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: orderData } = await supabase
        .from("orders")
        .select("*,branches(name,address,phone,email,city,province)")
        .eq("id", id)
        .single();
      if (!orderData) return;
      setOrder(orderData);
      const [{ data: itemData }, { data: paymentData }, { data: tenantData }] = await Promise.all([
        supabase.from("order_items").select("*").eq("order_id", id).is("deleted_at", null).order("created_at"),
        supabase.from("payments").select("*").eq("order_id", id).eq("status", "verified").is("deleted_at", null).order("created_at"),
        supabase.from("tenants").select("name,app_name,app_tagline,logo_url,currency").eq("id", orderData.tenant_id).single(),
      ]);
      setItems(itemData ?? []);
      setPayments(paymentData ?? []);
      setTenant(tenantData ?? null);
    })();
  }, [id, supabase]);

  const paid = useMemo(() => payments.reduce((sum, row) => sum + Number(row.amount || 0), 0), [payments]);

  if (!order) return <div className="muted">Memuat struk...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="print-hidden flex items-center justify-between gap-3">
        <Link href={`/orders/${id}`} className="btn-secondary gap-2"><ArrowLeft size={16}/> Kembali</Link>
        <button onClick={() => window.print()} className="btn-primary gap-2"><Printer size={16}/> Print Struk</button>
      </div>

      <section className="receipt-sheet overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
        <div className="brand-gradient p-6 text-white sm:p-8">
          <div className="flex items-center gap-4">
            {tenant?.logo_url ? <img src={tenant.logo_url} alt="Logo" className="h-14 w-14 rounded-2xl bg-white/20 object-cover"/> : <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20 text-2xl font-black">{String(tenant?.app_name || tenant?.name || "L").charAt(0)}</div>}
            <div><div className="text-2xl font-black">{tenant?.name || "Laundry"}</div><div className="mt-1 text-sm text-white/75">{tenant?.app_tagline || "Laundry Receipt"}</div></div>
          </div>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Order</div><div className="mt-1 text-xl font-black">{order.order_number}</div><div className="mt-1 text-sm text-slate-500">{dateTime(order.created_at)}</div></div>
            <div className="sm:text-right"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Cabang</div><div className="mt-1 font-black">{order.branches?.name || "-"}</div><div className="mt-1 text-sm text-slate-500">{[order.branches?.address, order.branches?.city, order.branches?.province].filter(Boolean).join(", ")}</div></div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Pelanggan</div><div className="mt-1 font-black">{order.customer_name || "Walk-in Customer"}</div><div className="text-sm text-slate-500">{order.customer_phone || "Tanpa nomor WhatsApp"}</div></div>

          <div className="overflow-hidden rounded-2xl border border-slate-100">
            {items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-b-0"><div><div className="font-black">{item.item_name}</div><div className="mt-1 text-sm text-slate-500">{item.quantity} {item.unit_label} × {rupiah(item.unit_price)}</div>{item.notes && <div className="mt-1 text-xs text-slate-400">{item.notes}</div>}</div><div className="font-black">{rupiah(item.line_total)}</div></div>)}
          </div>

          <div className="ml-auto max-w-sm space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><b>{rupiah(order.subtotal)}</b></div>
            {Number(order.discount_amount || 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">Diskon</span><b>- {rupiah(order.discount_amount)}</b></div>}
            {Number(order.service_fee || 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">Service Fee</span><b>{rupiah(order.service_fee)}</b></div>}
            {Number(order.delivery_fee || 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">Antar/Jemput</span><b>{rupiah(order.delivery_fee)}</b></div>}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg"><span className="font-black">Grand Total</span><span className="font-black">{rupiah(order.grand_total)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Dibayar</span><b>{rupiah(paid)}</b></div>
            <div className="flex justify-between"><span className="text-slate-500">Sisa</span><b>{rupiah(Math.max(0, Number(order.grand_total || 0) - paid))}</b></div>
          </div>

          {(order.pickup_address || order.delivery_address) && <div className="grid gap-3 sm:grid-cols-2">{order.pickup_address && <div className="rounded-2xl bg-sky-50 p-4"><div className="text-xs font-bold uppercase text-sky-600">Pickup</div><div className="mt-1 text-sm text-slate-700">{order.pickup_address}</div></div>}{order.delivery_address && <div className="rounded-2xl bg-emerald-50 p-4"><div className="text-xs font-bold uppercase text-emerald-600">Delivery</div><div className="mt-1 text-sm text-slate-700">{order.delivery_address}</div></div>}</div>}

          <div className="border-t border-dashed border-slate-200 pt-5 text-center text-xs leading-5 text-slate-400">Terima kasih telah menggunakan layanan {tenant?.name || "kami"}. Simpan struk ini sebagai referensi order Anda.</div>
        </div>
      </section>
    </div>
  );
}
