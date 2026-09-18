"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { getBrowserAppContext } from "@/lib/browser-context";
import {
  Bike,
  Building2,
  Clock3,
  Globe2,
  MapPin,
  Pencil,
  Plus,
  Power,
  Save,
  Truck,
  X,
} from "lucide-react";

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
      .select("id,name,code,phone,email,address,city,province,is_main,is_active,public_visible,show_public_prices,show_public_estimates,pickup_enabled,delivery_enabled,pickup_delivery_enabled,pickup_fee,delivery_fee,pickup_delivery_fee,pickup_min_order,delivery_min_order,delivery_radius_km,service_area_text,opening_hours,homepage_image_url")
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
        <div><div className="content-kicker"><Building2 size={14}/> MULTI BRANCH</div><h1 className="page-title mt-2">Cabang & Operasional Antar Jemput</h1><p className="muted mt-1">Atur identitas cabang, area layanan, pickup, delivery, dan visibilitas homepage.</p></div>
        <div className="theme-card theme-card-2 px-4 py-3"><div className="text-xs font-bold text-slate-500">Cabang aktif</div><div className="text-xl font-black">{rows.filter((r) => r.is_active).length}</div></div>
      </div>

      {msg && <div className="rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-700 ring-1 ring-sky-100">{msg}</div>}

      <div className="grid gap-5 xl:grid-cols-[470px_1fr]">
        <form onSubmit={save} className="premium-panel h-fit p-5 xl:sticky xl:top-24">
          <div className="premium-form-head flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Building2 size={18}/></div><div><h2 className="section-title">{editing ? "Edit Cabang" : "Tambah Cabang"}</h2><p className="text-xs text-slate-500">Semua setting di bawah berlaku untuk cabang ini.</p></div></div>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm(init); }} className="rounded-xl bg-white/70 p-2"><X size={18}/></button>}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_120px] gap-3"><div><label className="label">Nama Cabang</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required/></div><div><label className="label">Kode</label><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CBG01"/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="label">WhatsApp Cabang</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/></div><div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></div></div>
            <div><label className="label">Alamat</label><textarea className="input min-h-20" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}/></div>
            <div className="grid grid-cols-2 gap-3"><input className="input" placeholder="Kota" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}/><input className="input" placeholder="Provinsi" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}/></div>
            <div><label className="label">Jam Operasional</label><div className="relative"><Clock3 className="absolute left-3 top-3 text-slate-400" size={16}/><input className="input pl-9" placeholder="Senin–Minggu 08:00–20:00" value={form.opening_hours} onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}/></div></div>

            <div className="rounded-3xl bg-white/45 p-4 ring-1 ring-white/70">
              <div className="mb-3 flex items-center gap-2 font-black"><Truck size={17} className="text-[var(--brand-primary)]"/> Pickup & Delivery</div>
              <div className="space-y-2">
                {switchRow("Pickup Cucian", "Kurir/staff mengambil cucian dari pelanggan.", form.pickup_enabled, (value) => setForm({ ...form, pickup_enabled: value, pickup_delivery_enabled: value && form.delivery_enabled ? form.pickup_delivery_enabled : false }))}
                {switchRow("Delivery Cucian", "Order selesai dapat diantar ke pelanggan.", form.delivery_enabled, (value) => setForm({ ...form, delivery_enabled: value, pickup_delivery_enabled: value && form.pickup_enabled ? form.pickup_delivery_enabled : false }))}
                {form.pickup_enabled && form.delivery_enabled && switchRow("Pickup + Delivery", "Izinkan satu order memakai jemput sekaligus antar.", form.pickup_delivery_enabled, (value) => setForm({ ...form, pickup_delivery_enabled: value }))}
              </div>
              {(form.pickup_enabled || form.delivery_enabled) && <div className="mt-3 grid grid-cols-2 gap-3">
                {form.pickup_enabled && <div><label className="label">Biaya Pickup</label><input className="input" type="number" min="0" value={form.pickup_fee} onChange={(e) => setForm({ ...form, pickup_fee: e.target.value })}/></div>}
                {form.delivery_enabled && <div><label className="label">Biaya Delivery</label><input className="input" type="number" min="0" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}/></div>}
                {form.pickup_delivery_enabled && <div><label className="label">Biaya Paket Jemput+Antar</label><input className="input" type="number" min="0" value={form.pickup_delivery_fee} onChange={(e) => setForm({ ...form, pickup_delivery_fee: e.target.value })}/></div>}
                {form.pickup_enabled && <div><label className="label">Min. Order Pickup</label><input className="input" type="number" min="0" value={form.pickup_min_order} onChange={(e) => setForm({ ...form, pickup_min_order: e.target.value })}/></div>}
                {form.delivery_enabled && <div><label className="label">Min. Order Delivery</label><input className="input" type="number" min="0" value={form.delivery_min_order} onChange={(e) => setForm({ ...form, delivery_min_order: e.target.value })}/></div>}
                <div><label className="label">Radius (km)</label><input className="input" type="number" step="0.1" min="0" value={form.delivery_radius_km} onChange={(e) => setForm({ ...form, delivery_radius_km: e.target.value })}/></div>
              </div>}
              {(form.pickup_enabled || form.delivery_enabled) && <div className="mt-3"><label className="label">Area Layanan</label><textarea className="input min-h-20" placeholder="Contoh: Cibinong, Pakansari, Nanggewer, maksimal 7 km" value={form.service_area_text} onChange={(e) => setForm({ ...form, service_area_text: e.target.value })}/></div>}
            </div>

            <div className="rounded-3xl bg-white/45 p-4 ring-1 ring-white/70">
              <div className="mb-3 flex items-center gap-2 font-black"><Globe2 size={17} className="text-[var(--brand-primary)]"/> Homepage Cabang</div>
              <div className="space-y-2">
                {switchRow("Tampilkan Cabang", "Cabang ini boleh muncul di homepage publik.", form.public_visible, (value) => setForm({ ...form, public_visible: value }))}
                {switchRow("Tampilkan Harga", "Harga cabang boleh ditampilkan publik.", form.show_public_prices, (value) => setForm({ ...form, show_public_prices: value }))}
                {switchRow("Tampilkan Estimasi", "Estimasi pengerjaan boleh ditampilkan publik.", form.show_public_estimates, (value) => setForm({ ...form, show_public_estimates: value }))}
                <div className="pt-2">
                  <label className="label">URL Image Hero Cabang (opsional)</label>
                  <input
                    className="input"
                    type="url"
                    placeholder="https://domain.com/foto-cabang.jpg"
                    value={form.homepage_image_url}
                    onChange={(e) => setForm({ ...form, homepage_image_url: e.target.value })}
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">Jika diisi, card hero homepage akan menampilkan foto cabang. Jika kosong, otomatis kembali ke card informasi teks.</p>
                  {form.homepage_image_url && (
                    <div
                      className="mt-3 h-32 rounded-2xl bg-cover bg-center ring-1 ring-white/80"
                      style={{ backgroundImage: `linear-gradient(180deg, rgba(15,23,42,.05), rgba(15,23,42,.18)), url("${form.homepage_image_url.replace(/"/g, "%22")}")` }}
                    />
                  )}
                </div>
              </div>
            </div>

            <button className="btn-primary w-full gap-2"><Save size={16}/> {editing ? "Update Cabang" : "Simpan Cabang"}</button>
          </div>
        </form>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((row, index) => (
            <div key={row.id} className={`theme-card theme-card-${(index % 8) + 1} p-5 ${!row.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between"><div className="brand-gradient grid h-11 w-11 place-items-center rounded-2xl text-white"><Building2 size={20}/></div><div className="flex gap-1">{row.is_main && <span className="badge-info">Utama</span>}<span className={row.is_active ? "badge-success" : "badge-neutral"}>{row.is_active ? "Aktif" : "Off"}</span></div></div>
              <div className="mt-4 text-lg font-black">{row.name}</div><div className="text-sm text-slate-500">{row.code || "Tanpa kode"}</div>
              {(row.address || row.city) && <div className="mt-3 flex gap-2 text-sm text-slate-500"><MapPin size={16} className="mt-0.5 shrink-0"/><span>{[row.address, row.city, row.province].filter(Boolean).join(", ")}</span></div>}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-white/55 p-3"><div className="flex items-center gap-1 font-black"><Bike size={14}/> Pickup</div><div className="mt-1 text-slate-500">{row.pickup_enabled ? "Aktif" : "Off"}</div></div><div className="rounded-xl bg-white/55 p-3"><div className="flex items-center gap-1 font-black"><Truck size={14}/> Delivery</div><div className="mt-1 text-slate-500">{row.delivery_enabled ? "Aktif" : "Off"}</div></div></div>
              {row.service_area_text && <div className="mt-3 rounded-xl bg-white/45 p-3 text-xs text-slate-500">Area: {row.service_area_text}</div>}
              <div className="mt-4 flex gap-2"><button onClick={() => edit(row)} className="btn-secondary flex-1 gap-1 !px-3 !py-2 text-sm"><Pencil size={14}/> Edit</button><button onClick={() => toggle(row)} className="btn-secondary !px-3 !py-2"><Power size={15}/></button></div>
            </div>
          ))}
          {!rows.length && <div className="premium-empty md:col-span-2">Belum ada cabang.</div>}
        </div>
      </div>
    </div>
  );
}
