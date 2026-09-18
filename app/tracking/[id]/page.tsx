import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Banknote,
  Bike,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  PackageCheck,
  Shirt,
  Store,
  Truck,
} from "lucide-react";
import { getPublicTracking } from "@/lib/public-tracking";
import { normalizeTheme, themeCssVars } from "@/lib/theme";
import { rupiah, dateTime, statusLabel } from "@/lib/ui";
import { waLink } from "@/lib/homepage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const requestLabels: Record<string,string> = {
  new: "Request Masuk",
  confirmed: "Dikonfirmasi",
  courier_on_the_way: "Kurir Menuju Lokasi",
  picked_up: "Sudah Dijemput",
  arrived: "Tiba di Laundry",
  converted: "Menjadi Order",
  cancelled: "Dibatalkan",
};

const requestFlow = ["new","confirmed","courier_on_the_way","picked_up","arrived","converted"];
const orderFlow = ["received","washing","drying","ironing","ready","out_for_delivery","completed"];

function PaymentInfo({ branch, amount, method }: { branch: any; amount: number; method?: string }) {
  if (amount <= 0) return null;
  return <section className="public-about-card"><div className="flex items-center gap-2"><Banknote className="text-[var(--brand-primary)]"/><h2 className="text-xl font-black">Pembayaran</h2></div><div className="mt-3 text-3xl font-black">{rupiah(amount)}</div><div className="mt-1 text-xs text-slate-500">Nominal yang perlu dibayar saat ini.</div><div className="mt-4 grid gap-3 sm:grid-cols-2">{branch?.public_transfer_enabled && <div className="rounded-2xl bg-white/65 p-4"><div className="text-xs font-bold uppercase text-slate-400">Transfer Bank</div><div className="mt-1 font-black">{branch.bank_name || "Bank"}</div><div className="text-sm text-slate-600">{branch.bank_account_number || "-"}</div><div className="text-xs text-slate-400">a.n {branch.bank_account_name || "-"}</div></div>}{branch?.public_qris_enabled && <div className="rounded-2xl bg-white/65 p-4"><div className="text-xs font-bold uppercase text-slate-400">QRIS</div>{branch.qris_image_url ? <img src={branch.qris_image_url} alt="QRIS" className="mt-3 max-h-64 w-full rounded-2xl object-contain"/> : <div className="mt-2 text-sm text-slate-500">QRIS aktif. Hubungi cabang untuk kode pembayaran.</div>}</div>}{branch?.public_ewallet_enabled && <div className="rounded-2xl bg-white/65 p-4"><div className="text-xs font-bold uppercase text-slate-400">E-Wallet</div><div className="mt-1 font-black">{branch.ewallet_name || "E-Wallet"}</div><div className="text-sm text-slate-600">{branch.ewallet_number || "-"}</div></div>}{branch?.public_cash_enabled && <div className="rounded-2xl bg-white/65 p-4"><div className="text-xs font-bold uppercase text-slate-400">Cash</div><div className="mt-1 font-black">Bayar Tunai</div><div className="text-sm text-slate-500">Bisa dibayar saat pickup/drop-off sesuai kebijakan cabang.</div></div>}</div>{branch?.public_payment_note && <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">{branch.public_payment_note}</div>}{method && method !== "after_weighing" && <div className="mt-3 text-xs text-slate-400">Preferensi: {method.replace(/_/g," ")}</div>}</section>;
}

export default async function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPublicTracking(id);
  if (!data?.found) redirect("/");
  const theme = normalizeTheme(data.business?.theme_config);
  const appName = data.business?.app_name || data.business?.name || "Laundry";
  const wa = waLink(data.branch?.phone, `Halo ${data.business?.name || appName}, saya ingin menanyakan tracking cucian saya.`);

  if (data.type === "request") {
    const request = data.request || {};
    const currentIndex = requestFlow.indexOf(request.status);
    return <main className="public-home min-h-screen" style={themeCssVars(theme)}><header className="border-b border-white/70 bg-white/85"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6"><Link href="/" className="font-black">{appName}</Link>{wa && <a href={wa} className="public-btn-secondary" target="_blank" rel="noreferrer"><MessageCircle size={16}/> WhatsApp</a>}</div></header><section className="mx-auto max-w-5xl space-y-5 px-4 py-10 sm:px-6"><div><div className="public-kicker"><Bike size={14}/> TRACKING REQUEST</div><h1 className="mt-3 text-4xl font-black">{request.request_number}</h1><p className="mt-2 text-slate-500">{request.customer_name} • {data.branch?.name}</p></div><div className="public-about-card"><div className="flex items-center justify-between gap-3"><div><div className="text-xs font-bold uppercase text-slate-400">Status Saat Ini</div><div className="mt-1 text-2xl font-black">{requestLabels[request.status] || request.status}</div></div><PackageCheck className="text-[var(--brand-primary)]" size={34}/></div><div className="mt-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{requestFlow.map((status,index)=><div key={status} className={`rounded-2xl p-3 text-center text-xs font-bold ${index <= currentIndex ? "text-white" : "bg-white/60 text-slate-400"}`} style={index <= currentIndex ? {backgroundImage:"linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))"}:undefined}>{requestLabels[status]}</div>)}</div></div><div className="grid gap-5 lg:grid-cols-[1fr_340px]"><section className="public-about-card"><h2 className="text-xl font-black">Detail Request</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><div className="text-xs font-bold uppercase text-slate-400">Jenis</div><div className="font-black">{request.request_type === "pickup" ? "Jemput Cucian" : "Antar ke Toko"}</div></div><div><div className="text-xs font-bold uppercase text-slate-400">Jadwal</div><div className="font-black">{request.requested_at ? dateTime(request.requested_at) : "Fleksibel"}</div></div>{request.address && <div className="sm:col-span-2"><div className="text-xs font-bold uppercase text-slate-400">Alamat</div><div className="font-black">{request.address}</div></div>}</div><div className="mt-5 space-y-2">{(data.items ?? []).map((item,index)=><div key={index} className="flex items-start justify-between gap-3 rounded-2xl bg-white/60 p-3"><div><div className="font-black">{item.name}</div><div className="text-xs text-slate-500">{item.quantity} {item.unit_label}</div></div><div className="font-black">{Number(item.estimated_subtotal||0)>0?rupiah(item.estimated_subtotal):"Estimasi kasir"}</div></div>)}</div></section><aside className="space-y-4"><div className="public-hero-card"><div className="text-xs font-bold uppercase text-slate-400">Estimasi Sementara</div><div className="mt-1 text-3xl font-black">{Number(request.estimated_amount||0)>0?rupiah(request.estimated_amount):"Belum dihitung"}</div><div className="mt-2 text-xs text-slate-500">Harga final setelah penimbangan / konfirmasi kasir.</div></div><PaymentInfo branch={data.branch} amount={Number(request.payment_due_now||0)} method={request.payment_preference}/></aside></div></section></main>;
  }

  const order = data.order || {};
  const currentIndex = orderFlow.indexOf(order.status);
  return <main className="public-home min-h-screen" style={themeCssVars(theme)}><header className="border-b border-white/70 bg-white/85"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6"><Link href="/" className="font-black">{appName}</Link>{wa && <a href={wa} className="public-btn-secondary" target="_blank" rel="noreferrer"><MessageCircle size={16}/> WhatsApp</a>}</div></header><section className="mx-auto max-w-5xl space-y-5 px-4 py-10 sm:px-6"><div><div className="public-kicker"><Shirt size={14}/> TRACKING ORDER</div><h1 className="mt-3 text-4xl font-black">{order.order_number}</h1><p className="mt-2 text-slate-500">{order.customer_name} • {data.branch?.name}</p></div><div className="public-about-card"><div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase text-slate-400">Status Cucian</div><div className="mt-1 text-2xl font-black">{statusLabel[order.status] || order.status}</div></div>{order.status === "completed" ? <CheckCircle2 className="text-emerald-500" size={36}/> : <PackageCheck className="text-[var(--brand-primary)]" size={36}/>}</div><div className="mt-6 grid gap-2 sm:grid-cols-4 lg:grid-cols-7">{orderFlow.map((status,index)=><div key={status} className={`rounded-2xl p-3 text-center text-[11px] font-bold ${index <= currentIndex ? "text-white" : "bg-white/60 text-slate-400"}`} style={index <= currentIndex ? {backgroundImage:"linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))"}:undefined}>{statusLabel[status]||status}</div>)}</div></div><div className="grid gap-5 lg:grid-cols-[1fr_340px]"><section className="public-about-card"><h2 className="text-xl font-black">Detail Cucian</h2><div className="mt-4 space-y-2">{(data.items ?? []).map((item,index)=><div key={index} className="flex items-start justify-between gap-3 rounded-2xl bg-white/60 p-3"><div><div className="font-black">{item.name}</div><div className="text-xs text-slate-500">{item.quantity} {item.unit_label} × {rupiah(item.unit_price)}</div></div><div className="font-black">{rupiah(item.line_total)}</div></div>)}</div>{order.pickup_address && <div className="mt-4 rounded-2xl bg-sky-50 p-4"><MapPin size={15} className="mr-1 inline"/><b>Pickup:</b> {order.pickup_address}</div>}{order.delivery_address && <div className="mt-3 rounded-2xl bg-emerald-50 p-4"><Truck size={15} className="mr-1 inline"/><b>Delivery:</b> {order.delivery_address}</div>}</section><aside className="space-y-4"><div className="public-hero-card"><div className="text-xs font-bold uppercase text-slate-400">Total</div><div className="mt-1 text-3xl font-black">{rupiah(order.grand_total)}</div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-emerald-50 p-3"><div className="text-xs text-emerald-600">Dibayar</div><b>{rupiah(order.paid_amount)}</b></div><div className="rounded-2xl bg-amber-50 p-3"><div className="text-xs text-amber-600">Sisa</div><b>{rupiah(order.balance_due)}</b></div></div>{order.promised_at && <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Clock3 size={15}/> Estimasi selesai {dateTime(order.promised_at)}</div>}</div><PaymentInfo branch={data.branch} amount={Number(order.balance_due||0)}/></aside></div></section></main>;
}
