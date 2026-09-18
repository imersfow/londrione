"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { getBrowserAppContext } from "@/lib/browser-context";
import {
  Banknote,
  Bike,
  Building2,
  Clock3,
  Globe2,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Plus,
  Power,
  Save,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";

const PAYMENT_TIMINGS = [
  { value: "after_weighing", label: "Bayar setelah ditimbang" },
  { value: "deposit", label: "DP saat request online" },
  { value: "upfront", label: "Bayar penuh jika harga sudah pasti" },
] as const;

type Branch = {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  is_main: boolean;
  is_active: boolean;
  public_visible: boolean;
  show_public_prices: boolean;
  show_public_estimates: boolean;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  pickup_delivery_enabled: boolean;
  pickup_fee: number;
  delivery_fee: number;
  pickup_delivery_fee: number;
  pickup_min_order: number;
  delivery_min_order: number;
  delivery_radius_km: number | null;
  service_area_text: string | null;
  opening_hours: string | null;
  homepage_image_url: string | null;
  online_order_enabled: boolean;
  online_pickup_enabled: boolean;
  online_dropoff_enabled: boolean;
  online_payment_timing: "after_weighing" | "deposit" | "upfront";
  online_deposit_amount: number;
  public_order_note: string | null;
  public_cash_enabled: boolean;
  public_transfer_enabled: boolean;
  public_qris_enabled: boolean;
  public_ewallet_enabled: boolean;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  qris_image_url: string | null;
  ewallet_name: string | null;
  ewallet_number: string | null;
  public_payment_note: string | null;
};

const init = {
  name: "",
  code: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  province: "",
  public_visible: true,
  show_public_prices: true,
  show_public_estimates: true,
  pickup_enabled: false,
  delivery_enabled: false,
  pickup_delivery_enabled: false,
  pickup_fee: "0",
  delivery_fee: "0",
  pickup_delivery_fee: "0",
  pickup_min_order: "0",
  delivery_min_order: "0",
  delivery_radius_km: "",
  service_area_text: "",
  opening_hours: "",
  homepage_image_url: "",
  online_order_enabled: false,
  online_pickup_enabled: true,
  online_dropoff_enabled: true,
  online_payment_timing: "after_weighing" as "after_weighing" | "deposit" | "upfront",
  online_deposit_amount: "0",
  public_order_note: "",
  public_cash_enabled: true,
  public_transfer_enabled: false,
  public_qris_enabled: false,
  public_ewallet_enabled: false,
  bank_name: "",
  bank_account_number: "",
  bank_account_name: "",
  qris_image_url: "",
  ewallet_name: "",
  ewallet_number: "",
  public_payment_note: "",
};

export default function BranchesPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Branch[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [form, setForm] = useState(init);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const ctx = await getBrowserAppContext();
    if (!ctx) return;
    setTenantId(ctx.tenantId);
    const { data, error } = await supabase
      .from("branches")
      .select("id,name,code,phone,email,address,city,province,is_main,is_active,public_visible,show_public_prices,show_public_estimates,pickup_enabled,delivery_enabled,pickup_delivery_enabled,pickup_fee,delivery_fee,pickup_delivery_fee,pickup_min_order,delivery_min_order,delivery_radius_km,service_area_text,opening_hours,homepage_image_url,online_order_enabled,online_pickup_enabled,online_dropoff_enabled,online_payment_timing,online_deposit_amount,public_order_note,public_cash_enabled,public_transfer_enabled,public_qris_enabled,public_ewallet_enabled,bank_name,bank_account_number,bank_account_name,qris_image_url,ewallet_name,ewallet_number,public_payment_note")
      .eq("tenant_id", ctx.tenantId)
      .order("is_main", { ascending: false })
      .order("name");
    if (error) return setMsg(error.message);
    setRows((data ?? []) as Branch[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!form.name.trim()) return setMsg("Nama cabang wajib diisi.");

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      province: form.province.trim() || null,
      public_visible: form.public_visible,
      show_public_prices: form.show_public_prices,
      show_public_estimates: form.show_public_estimates,
      pickup_enabled: form.pickup_enabled,
      delivery_enabled: form.delivery_enabled,
      pickup_delivery_enabled: form.pickup_enabled && form.delivery_enabled ? form.pickup_delivery_enabled : false,
      pickup_fee: Number(form.pickup_fee || 0),
      delivery_fee: Number(form.delivery_fee || 0),
      pickup_delivery_fee: Number(form.pickup_delivery_fee || 0),
      pickup_min_order: Number(form.pickup_min_order || 0),
      delivery_min_order: Number(form.delivery_min_order || 0),
      delivery_radius_km: form.delivery_radius_km ? Number(form.delivery_radius_km) : null,
      service_area_text: form.service_area_text.trim() || null,
      opening_hours: form.opening_hours.trim() || null,
      homepage_image_url: form.homepage_image_url.trim() || null,
      online_order_enabled: form.online_order_enabled,
      online_pickup_enabled: form.online_pickup_enabled,
      online_dropoff_enabled: form.online_dropoff_enabled,
      online_payment_timing: form.online_payment_timing,
      online_deposit_amount: Number(form.online_deposit_amount || 0),
      public_order_note: form.public_order_note.trim() || null,
      public_cash_enabled: form.public_cash_enabled,
      public_transfer_enabled: form.public_transfer_enabled,
      public_qris_enabled: form.public_qris_enabled,
      public_ewallet_enabled: form.public_ewallet_enabled,
      bank_name: form.bank_name.trim() || null,
      bank_account_number: form.bank_account_number.trim() || null,
      bank_account_name: form.bank_account_name.trim() || null,
      qris_image_url: form.qris_image_url.trim() || null,
      ewallet_name: form.ewallet_name.trim() || null,
      ewallet_number: form.ewallet_number.trim() || null,
      public_payment_note: form.public_payment_note.trim() || null,
    };

    const result = editing
      ? await supabase.from("branches").update(payload).eq("id", editing.id)
      : await supabase.from("branches").insert({ tenant_id: tenantId, ...payload });
    if (result.error) return setMsg(result.error.message);
    setForm(init);
    setEditing(null);
    setMsg("Cabang tersimpan.");
    await load();
  }

  function edit(row: Branch) {
    setEditing(row);
    setForm({
      name: row.name,
      code: row.code || "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      city: row.city || "",
      province: row.province || "",
      public_visible: row.public_visible !== false,
      show_public_prices: row.show_public_prices !== false,
      show_public_estimates: row.show_public_estimates !== false,
      pickup_enabled: row.pickup_enabled === true,
      delivery_enabled: row.delivery_enabled === true,
      pickup_delivery_enabled: row.pickup_delivery_enabled === true,
      pickup_fee: String(row.pickup_fee || 0),
      delivery_fee: String(row.delivery_fee || 0),
      pickup_delivery_fee: String(row.pickup_delivery_fee || 0),
      pickup_min_order: String(row.pickup_min_order || 0),
      delivery_min_order: String(row.delivery_min_order || 0),
      delivery_radius_km: row.delivery_radius_km == null ? "" : String(row.delivery_radius_km),
      service_area_text: row.service_area_text || "",
      opening_hours: row.opening_hours || "",
      homepage_image_url: row.homepage_image_url || "",
      online_order_enabled: row.online_order_enabled === true,
      online_pickup_enabled: row.online_pickup_enabled !== false,
      online_dropoff_enabled: row.online_dropoff_enabled !== false,
      online_payment_timing: row.online_payment_timing || "after_weighing",
      online_deposit_amount: String(row.online_deposit_amount || 0),
      public_order_note: row.public_order_note || "",
      public_cash_enabled: row.public_cash_enabled !== false,
      public_transfer_enabled: row.public_transfer_enabled === true,
      public_qris_enabled: row.public_qris_enabled === true,
      public_ewallet_enabled: row.public_ewallet_enabled === true,
      bank_name: row.bank_name || "",
      bank_account_number: row.bank_account_number || "",
      bank_account_name: row.bank_account_name || "",
      qris_image_url: row.qris_image_url || "",
      ewallet_name: row.ewallet_name || "",
      ewallet_number: row.ewallet_number || "",
      public_payment_note: row.public_payment_note || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggle(row: Branch) {
    if (row.is_main && row.is_active) return setMsg("Cabang utama jangan dinonaktifkan.");
    const { error } = await supabase.from("branches").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) return setMsg(error.message);
    await load();
  }

  const switchRow = (label: string, description: string, checked: boolean, onChange: (value: boolean) => void) => (
    <label className="flex items-center justify-between gap-4 rounded-2xl bg-white/55 p-3">
      <span><span className="block text-sm font-black text-slate-800">{label}</span><span className="block text-xs text-slate-500">{description}</span></span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-violet-600"/>
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="content-kicker"><Building2 size={14}/> MULTI BRANCH</div><h1 className="page-title mt-2">Cabang & Operasional</h1><p className="muted mt-1">Atur cabang, pickup/delivery, online order, dan pembayaran publik.</p></div>
        <div className="theme-card theme-card-2 px-4 py-3"><div className="text-xs font-bold text-slate-500">Cabang aktif</div><div className="text-xl font-black">{rows.filter((r) => r.is_active).length}</div></div>
      </div>

      {msg && <div className="rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-700 ring-1 ring-sky-100">{msg}</div>}

      <div className="grid gap-5 xl:grid-cols-[500px_1fr]">
        <form onSubmit={save} className="premium-panel h-fit p-5 xl:sticky xl:top-24">
          <div className="premium-form-head flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Building2 size={18}/></div><div><h2 className="section-title">{editing ? "Edit Cabang" : "Tambah Cabang"}</h2><p className="text-xs text-slate-500">Setting ini berlaku untuk operasional dan homepage.</p></div></div>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm(init); }} className="rounded-xl bg-white/70 p-2"><X size={16}/></button>}
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2"><input className="input" placeholder="Nama cabang" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/><input className="input" placeholder="Kode cabang" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}/></div>
            <div className="grid gap-3 sm:grid-cols-2"><input className="input" placeholder="WhatsApp cabang" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/><input className="input" type="email" placeholder="Email cabang" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></div>
            <textarea className="input min-h-20" placeholder="Alamat" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}/>
            <div className="grid gap-3 sm:grid-cols-2"><input className="input" placeholder="Kota" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}/><input className="input" placeholder="Provinsi" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}/></div>
            <input className="input" placeholder="Jam operasional, contoh 08:00 - 21:00" value={form.opening_hours} onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}/>
            <div className="rounded-2xl bg-white/55 p-4"><div className="mb-2 flex items-center gap-2 font-black"><ImageIcon size={16}/> Homepage Hero Cabang</div><input className="input" placeholder="URL image hero cabang (opsional)" value={form.homepage_image_url} onChange={(e) => setForm({ ...form, homepage_image_url: e.target.value })}/></div>

            <div className="rounded-3xl bg-white/45 p-4 ring-1 ring-white/80"><div className="mb-3 flex items-center gap-2 font-black"><Globe2 size={17}/> Homepage</div><div className="space-y-2">{switchRow("Tampilkan cabang", "Cabang boleh tampil di homepage publik.", form.public_visible, (v) => setForm({ ...form, public_visible: v }))}{switchRow("Tampilkan harga", "Harga cabang boleh tampil ke publik.", form.show_public_prices, (v) => setForm({ ...form, show_public_prices: v }))}{switchRow("Tampilkan estimasi", "Estimasi pengerjaan boleh tampil ke publik.", form.show_public_estimates, (v) => setForm({ ...form, show_public_estimates: v }))}</div></div>

            <div className="rounded-3xl bg-white/45 p-4 ring-1 ring-white/80"><div className="mb-3 flex items-center gap-2 font-black"><Truck size={17}/> Pickup & Delivery</div><div className="space-y-2">{switchRow("Pickup", "Kurir bisa menjemput cucian pelanggan.", form.pickup_enabled, (v) => setForm({ ...form, pickup_enabled: v }))}{switchRow("Delivery", "Kurir bisa mengantar cucian selesai.", form.delivery_enabled, (v) => setForm({ ...form, delivery_enabled: v }))}{switchRow("Pickup + Delivery", "Aktif jika Pickup dan Delivery sama-sama aktif.", form.pickup_delivery_enabled, (v) => setForm({ ...form, pickup_delivery_enabled: v }))}</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><input className="input" type="number" min="0" placeholder="Biaya pickup" value={form.pickup_fee} onChange={(e) => setForm({ ...form, pickup_fee: e.target.value })}/><input className="input" type="number" min="0" placeholder="Biaya delivery" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}/><input className="input" type="number" min="0" placeholder="Biaya pickup+delivery" value={form.pickup_delivery_fee} onChange={(e) => setForm({ ...form, pickup_delivery_fee: e.target.value })}/><input className="input" type="number" min="0" placeholder="Radius KM" value={form.delivery_radius_km} onChange={(e) => setForm({ ...form, delivery_radius_km: e.target.value })}/><input className="input" type="number" min="0" placeholder="Minimum pickup" value={form.pickup_min_order} onChange={(e) => setForm({ ...form, pickup_min_order: e.target.value })}/><input className="input" type="number" min="0" placeholder="Minimum delivery" value={form.delivery_min_order} onChange={(e) => setForm({ ...form, delivery_min_order: e.target.value })}/></div><textarea className="input mt-3 min-h-20" placeholder="Area layanan / kecamatan / catatan radius" value={form.service_area_text} onChange={(e) => setForm({ ...form, service_area_text: e.target.value })}/></div>

            <div className="rounded-3xl bg-gradient-to-br from-violet-50/80 to-sky-50/80 p-4 ring-1 ring-white/80"><div className="mb-3 flex items-center gap-2 font-black"><ShoppingCart size={17}/> Order Online</div><div className="space-y-2">{switchRow("Aktifkan order online", "Homepage menampilkan tombol Order Online.", form.online_order_enabled, (v) => setForm({ ...form, online_order_enabled: v }))}{switchRow("Pickup online", "Customer boleh request jemput cucian dari rumah.", form.online_pickup_enabled, (v) => setForm({ ...form, online_pickup_enabled: v }))}{switchRow("Drop-off online", "Customer boleh isi request dulu lalu antar ke toko.", form.online_dropoff_enabled, (v) => setForm({ ...form, online_dropoff_enabled: v }))}</div><div className="mt-3"><label className="label">Waktu Pembayaran Online</label><select className="input" value={form.online_payment_timing} onChange={(e) => setForm({ ...form, online_payment_timing: e.target.value as typeof form.online_payment_timing })}>{PAYMENT_TIMINGS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>{form.online_payment_timing === "deposit" && <div className="mt-3"><label className="label">Nominal DP</label><input className="input" type="number" min="0" value={form.online_deposit_amount} onChange={(e) => setForm({ ...form, online_deposit_amount: e.target.value })}/></div>}<textarea className="input mt-3 min-h-20" placeholder="Catatan order online untuk pelanggan" value={form.public_order_note} onChange={(e) => setForm({ ...form, public_order_note: e.target.value })}/></div>

            <div className="rounded-3xl bg-gradient-to-br from-emerald-50/80 to-cyan-50/80 p-4 ring-1 ring-white/80"><div className="mb-3 flex items-center gap-2 font-black"><Banknote size={17}/> Pembayaran Publik</div><div className="grid gap-2 sm:grid-cols-2">{switchRow("Cash", "Bayar tunai saat pickup/drop-off.", form.public_cash_enabled, (v) => setForm({ ...form, public_cash_enabled: v }))}{switchRow("Transfer", "Tampilkan rekening bank.", form.public_transfer_enabled, (v) => setForm({ ...form, public_transfer_enabled: v }))}{switchRow("QRIS", "Tampilkan URL gambar QRIS.", form.public_qris_enabled, (v) => setForm({ ...form, public_qris_enabled: v }))}{switchRow("E-Wallet", "Tampilkan akun e-wallet.", form.public_ewallet_enabled, (v) => setForm({ ...form, public_ewallet_enabled: v }))}</div>{form.public_transfer_enabled && <div className="mt-3 grid gap-3 sm:grid-cols-3"><input className="input" placeholder="Bank" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })}/><input className="input" placeholder="Nomor rekening" value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}/><input className="input" placeholder="Atas nama" value={form.bank_account_name} onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}/></div>}{form.public_qris_enabled && <input className="input mt-3" placeholder="URL image QRIS" value={form.qris_image_url} onChange={(e) => setForm({ ...form, qris_image_url: e.target.value })}/>} {form.public_ewallet_enabled && <div className="mt-3 grid gap-3 sm:grid-cols-2"><input className="input" placeholder="Nama e-wallet" value={form.ewallet_name} onChange={(e) => setForm({ ...form, ewallet_name: e.target.value })}/><input className="input" placeholder="Nomor e-wallet" value={form.ewallet_number} onChange={(e) => setForm({ ...form, ewallet_number: e.target.value })}/></div>}<textarea className="input mt-3 min-h-20" placeholder="Catatan pembayaran publik (opsional)" value={form.public_payment_note} onChange={(e) => setForm({ ...form, public_payment_note: e.target.value })}/></div>

            <button className="btn-primary w-full gap-2"><Save size={16}/>{editing ? "Simpan Perubahan" : "Tambah Cabang"}</button>
          </div>
        </form>

        <div className="grid content-start gap-4 md:grid-cols-2">
          {rows.map((row, index) => (
            <div key={row.id} className={`theme-card theme-card-${(index % 8) + 1} p-5`}>
              <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><div className="text-xl font-black">{row.name}</div>{row.is_main && <span className="badge-info">Utama</span>}{!row.is_active && <span className="badge-danger">Nonaktif</span>}{row.online_order_enabled && <span className="badge-success">Online Order</span>}</div><div className="mt-1 text-sm text-slate-500">{[row.address, row.city, row.province].filter(Boolean).join(", ") || "Alamat belum diisi"}</div></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/65 text-[var(--brand-primary)]"><MapPin size={19}/></div></div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">{row.pickup_enabled && <span className="public-chip"><Bike size={12}/> Pickup</span>}{row.delivery_enabled && <span className="public-chip"><Truck size={12}/> Delivery</span>}{row.opening_hours && <span className="public-chip"><Clock3 size={12}/> {row.opening_hours}</span>}{row.public_visible && <span className="public-chip"><Globe2 size={12}/> Homepage</span>}</div>
              <div className="mt-5 flex gap-2"><button type="button" onClick={() => edit(row)} className="btn-secondary flex-1 gap-2 !py-2 text-sm"><Pencil size={14}/> Edit</button><button type="button" onClick={() => toggle(row)} className="btn-secondary !px-3 !py-2"><Power size={15}/></button></div>
            </div>
          ))}
          {!rows.length && <div className="premium-empty md:col-span-2"><div className="text-center"><Plus className="mx-auto mb-2"/>Belum ada cabang.</div></div>}
        </div>
      </div>
    </div>
  );
}
