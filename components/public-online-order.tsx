"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  MinusCircle,
  PackageCheck,
  Plus,
  Send,
  Shirt,
  Store,
  WalletCards,
} from "lucide-react";
import { themeCssVars, normalizeTheme } from "@/lib/theme";
import { formatEstimate, type PublicHomepageData } from "@/lib/homepage";
import { rupiah } from "@/lib/ui";

type SelectedItem = { service_id: string; quantity: string; notes: string };

type SuccessData = {
  request_number: string;
  public_token: string;
  tracking_url: string;
  estimated_amount: number;
  payment_timing: string;
  payment_due_now: number;
  payment_preference: string;
};

export function PublicOnlineOrder({ data }: { data: PublicHomepageData }) {
  const router = useRouter();
  const theme = normalizeTheme(data.theme_config);
  const branch = data.selected_branch;
  const branches = (data.branches ?? []).filter((b) => b.online_order_enabled);
  const services = data.services ?? [];
  const [mode, setMode] = useState<"pickup" | "dropoff">(
    branch?.pickup_enabled && branch?.online_pickup_enabled !== false ? "pickup" : "dropoff"
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [requestedAt, setRequestedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [paymentPreference, setPaymentPreference] = useState("after_weighing");
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SuccessData | null>(null);

  const allowedMethods = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    if (branch?.public_cash_enabled) list.push({ value: "cash", label: "Cash" });
    if (branch?.public_transfer_enabled) list.push({ value: "bank_transfer", label: "Transfer Bank" });
    if (branch?.public_qris_enabled) list.push({ value: "qris", label: "QRIS" });
    if (branch?.public_ewallet_enabled) list.push({ value: "ewallet", label: "E-Wallet" });
    return list;
  }, [branch]);

  const estimate = useMemo(() => {
    return items.reduce((sum, item) => {
      const service = services.find((row) => row.id === item.service_id);
      if (!service?.price_visible || service.price == null) return sum;
      return sum + Number(item.quantity || 0) * Number(service.price || 0);
    }, 0);
  }, [items, services]);

  function toggleService(serviceId: string) {
    setItems((current) => {
      if (current.some((item) => item.service_id === serviceId)) return current.filter((item) => item.service_id !== serviceId);
      const service = services.find((row) => row.id === serviceId);
      return [...current, { service_id: serviceId, quantity: String(Math.max(Number(service?.min_quantity || 1), 1)), notes: "" }];
    });
  }

  function patchItem(serviceId: string, patch: Partial<SelectedItem>) {
    setItems((current) => current.map((item) => item.service_id === serviceId ? { ...item, ...patch } : item));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(null);
    if (!branch?.id) return setError("Cabang belum tersedia.");
    if (!name.trim() || !phone.trim()) return setError("Nama dan WhatsApp wajib diisi.");
    if (mode === "pickup" && !address.trim()) return setError("Alamat pickup wajib diisi.");

    setSaving(true);
    const response = await fetch("/api/public/order-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branch_id: branch.id,
        request_type: mode,
        customer_name: name,
        customer_phone: phone,
        customer_email: email,
        address,
        map_url: mapUrl,
        requested_at: requestedAt || null,
        notes,
        payment_preference: branch.online_payment_timing === "after_weighing" ? "after_weighing" : paymentPreference,
        items,
        website,
      }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setError(result?.error || "Gagal membuat request.");
    setSuccess(result as SuccessData);
  }

  if (!branch || branch.online_order_enabled !== true) {
    return (
      <main className="public-home min-h-screen p-5" style={themeCssVars(theme)}>
        <div className="mx-auto max-w-xl pt-24 text-center">
          <div className="public-about-card"><Store className="mx-auto text-[var(--brand-primary)]"/><h1 className="mt-4 text-3xl font-black">Order Online Belum Aktif</h1><p className="mt-3 text-slate-500">Cabang ini belum menerima request order dari website.</p><Link href="/" className="public-btn-primary mt-6"><ArrowLeft size={17}/> Kembali ke Homepage</Link></div>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="public-home min-h-screen p-5" style={themeCssVars(theme)}>
        <div className="mx-auto max-w-2xl pt-16">
          <div className="public-about-card text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-100 text-emerald-600"><CheckCircle2 size={34}/></div>
            <div className="mt-5 public-kicker">REQUEST DITERIMA</div>
            <h1 className="mt-3 text-3xl font-black">{success.request_number}</h1>
            <p className="mt-3 text-slate-500">Request online sudah masuk ke {branch.name}. Simpan link tracking untuk melihat status jemput/drop-off sampai cucian selesai.</p>
            {Number(success.estimated_amount || 0) > 0 && <div className="mx-auto mt-6 max-w-md rounded-3xl bg-white/65 p-5"><div className="text-xs font-bold uppercase text-slate-400">Estimasi Sementara</div><div className="mt-1 text-2xl font-black">{rupiah(success.estimated_amount)}</div>{success.payment_timing === "after_weighing" && <div className="mt-2 text-xs text-slate-500">Harga final setelah cucian ditimbang / dikonfirmasi kasir.</div>}{Number(success.payment_due_now || 0) > 0 && <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">Pembayaran awal: <b>{rupiah(success.payment_due_now)}</b></div>}</div>}
            <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href={success.tracking_url} className="public-btn-primary"><PackageCheck size={17}/> Buka Tracking</Link><Link href="/" className="public-btn-secondary"><ArrowLeft size={17}/> Homepage</Link></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="public-home min-h-screen" style={themeCssVars(theme)}>
      <header className="border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Link href="/" className="inline-flex items-center gap-2 font-black"><ArrowLeft size={17}/> Kembali</Link><div className="text-right"><div className="font-black">{data.business_name || data.app_name}</div><div className="text-xs text-slate-500">Order Online • {branch.name}</div></div></div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <form onSubmit={submit} className="space-y-5">
            <div><div className="public-kicker"><Send size={14}/> ORDER ONLINE</div><h1 className="mt-3 text-4xl font-black">Request Laundry dari Rumah</h1><p className="mt-3 max-w-2xl text-slate-500">Isi request sekarang. Untuk layanan kiloan, harga final dikonfirmasi setelah cucian ditimbang oleh kasir.</p></div>

            {branches.length > 1 && <div className="public-about-card"><label className="label">Pilih Cabang</label><select className="input" value={branch.id} onChange={(e) => router.push(`/order-online?branch=${e.target.value}`)}>{branches.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>}

            <div className="public-about-card"><div className="font-black">Cara menyerahkan cucian</div><div className="mt-3 grid gap-3 sm:grid-cols-2">{branch.pickup_enabled && branch.online_pickup_enabled !== false && <button type="button" onClick={() => setMode("pickup")} className={`rounded-3xl p-4 text-left ring-1 transition ${mode === "pickup" ? "text-white shadow-lg" : "bg-white/65 text-slate-700 ring-white"}`} style={mode === "pickup" ? { backgroundImage: "linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))" } : undefined}><Bike size={22}/><div className="mt-2 font-black">Jemput Cucian</div><div className={`mt-1 text-xs ${mode === "pickup" ? "text-white/75" : "text-slate-500"}`}>Kurir menjemput ke alamat Anda.</div></button>}{branch.online_dropoff_enabled !== false && <button type="button" onClick={() => setMode("dropoff")} className={`rounded-3xl p-4 text-left ring-1 transition ${mode === "dropoff" ? "text-white shadow-lg" : "bg-white/65 text-slate-700 ring-white"}`} style={mode === "dropoff" ? { backgroundImage: "linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))" } : undefined}><Store size={22}/><div className="mt-2 font-black">Antar ke Toko</div><div className={`mt-1 text-xs ${mode === "dropoff" ? "text-white/75" : "text-slate-500"}`}>Isi data dulu, timbang saat tiba di outlet.</div></button>}</div></div>

            <div className="public-about-card"><div className="font-black">Data Pelanggan</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className="input" placeholder="Nama lengkap" value={name} onChange={(e) => setName(e.target.value)} required/><input className="input" placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} required/><input className="input sm:col-span-2" type="email" placeholder="Email (opsional)" value={email} onChange={(e) => setEmail(e.target.value)}/>{mode === "pickup" && <textarea className="input min-h-24 sm:col-span-2" placeholder="Alamat lengkap pickup" value={address} onChange={(e) => setAddress(e.target.value)} required/>}<input className="input sm:col-span-2" placeholder="Link Google Maps / titik lokasi (opsional)" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)}/><div className="sm:col-span-2"><label className="label">Jadwal {mode === "pickup" ? "Pickup" : "Datang"} (opsional)</label><input className="input" type="datetime-local" value={requestedAt} onChange={(e) => setRequestedAt(e.target.value)}/></div></div></div>

            <div className="public-about-card"><div className="flex items-center justify-between gap-3"><div><div className="font-black">Perkiraan Layanan</div><div className="text-xs text-slate-500">Opsional. Kasir tetap mengkonfirmasi berat/jumlah dan layanan final.</div></div><Shirt className="text-[var(--brand-primary)]"/></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{services.slice(0,16).map((service, index) => { const selected = items.find((item) => item.service_id === service.id); return <div key={service.id} className="rounded-3xl p-4 ring-1 ring-white" style={{backgroundImage:`linear-gradient(135deg,var(--card-${(index%8)+1}-from),var(--card-${(index%8)+1}-to))`}}><button type="button" onClick={() => toggleService(service.id)} className="w-full text-left"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-wider text-slate-400">{service.category_name}</div><div className="mt-1 font-black">{service.name}</div></div><div className={`grid h-7 w-7 place-items-center rounded-full ${selected ? "bg-emerald-500 text-white" : "bg-white/65 text-slate-400"}`}>{selected ? <CheckCircle2 size={16}/> : <Plus size={16}/>}</div></div><div className="mt-2 text-xs text-slate-500">{service.price_visible && service.price != null ? `${rupiah(service.price)}/${service.unit_label || "layanan"}` : "Harga dikonfirmasi kasir"}{service.estimated_minutes ? ` • ${formatEstimate(service.estimated_minutes)}` : ""}</div></button>{selected && <div className="mt-3 grid grid-cols-[110px_1fr] gap-2"><input className="input" type="number" min="0.1" step="0.1" value={selected.quantity} onChange={(e) => patchItem(service.id,{quantity:e.target.value})}/><input className="input" placeholder="Catatan item" value={selected.notes} onChange={(e) => patchItem(service.id,{notes:e.target.value})}/></div>}</div>; })}</div></div>

            <div className="public-about-card"><div className="font-black">Pembayaran</div><div className="mt-2 text-sm text-slate-500">{branch.online_payment_timing === "after_weighing" ? "Pembayaran dilakukan setelah kasir menimbang dan mengkonfirmasi harga final." : branch.online_payment_timing === "deposit" ? `Cabang dapat meminta DP ${rupiah(branch.online_deposit_amount || 0)} setelah request dibuat.` : "Jika semua harga pasti, pembayaran penuh dapat dilakukan dari tracking. Layanan kiloan tetap menunggu timbang."}</div>{branch.online_payment_timing !== "after_weighing" && allowedMethods.length > 0 && <div className="mt-4"><label className="label">Preferensi Pembayaran</label><select className="input" value={paymentPreference === "after_weighing" ? allowedMethods[0]?.value || "cash" : paymentPreference} onChange={(e) => setPaymentPreference(e.target.value)}>{allowedMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></div>}</div>

            <div className="public-about-card"><label className="label">Catatan</label><textarea className="input min-h-24" placeholder="Noda khusus, patokan rumah, jenis pakaian, dll." value={notes} onChange={(e) => setNotes(e.target.value)}/><input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)}/></div>

            {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-600">{error}</div>}
            <button disabled={saving} className="public-btn-primary w-full justify-center py-4 text-base"><Send size={18}/>{saving ? "Mengirim request..." : "Kirim Request Laundry"}</button>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
            <div className="public-hero-card"><div className="text-xs font-black uppercase tracking-wider text-slate-400">Cabang</div><div className="mt-1 text-xl font-black">{branch.name}</div><div className="mt-2 text-sm text-slate-500">{[branch.address,branch.city,branch.province].filter(Boolean).join(", ") || "Alamat tersedia setelah dikonfirmasi."}</div>{branch.service_area_text && <div className="mt-4 rounded-2xl bg-white/60 p-3 text-sm text-slate-600"><MapPin size={14} className="mr-1 inline"/>{branch.service_area_text}</div>}{branch.public_order_note && <div className="mt-3 rounded-2xl bg-amber-50/80 p-3 text-sm text-amber-700">{branch.public_order_note}</div>}</div>
            <div className="public-hero-card"><div className="flex items-center gap-2"><WalletCards className="text-[var(--brand-primary)]"/><div className="font-black">Estimasi Request</div></div><div className="mt-4 text-3xl font-black">{estimate > 0 ? rupiah(estimate) : "Belum dihitung"}</div><div className="mt-2 text-xs leading-5 text-slate-500">Estimasi bukan tagihan final. Berat kiloan dan item aktual dikonfirmasi saat cucian diterima.</div></div>
            {branch.opening_hours && <div className="public-hero-card"><div className="flex items-center gap-2"><Clock3 className="text-[var(--brand-primary)]"/><div className="font-black">Jam Operasional</div></div><div className="mt-2 text-sm text-slate-600">{branch.opening_hours}</div></div>}
          </aside>
        </div>
      </section>
    </main>
  );
}
