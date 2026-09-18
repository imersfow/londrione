"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { getBrowserAppContext } from "@/lib/browser-context";
import { rupiah } from "@/lib/ui";
import {
  Archive,
  Boxes,
  Clock3,
  Coins,
  Layers3,
  PackageCheck,
  Pencil,
  Plus,
  Power,
  Save,
  Scale,
  Sparkles,
  Tags,
  X,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

type Service = {
  id: string;
  name: string;
  category: string | null;
  category_id: string | null;
  service_kind: "service" | "package";
  pricing_mode: string;
  unit_label: string;
  base_price: number;
  min_quantity: number;
  estimated_minutes: number | null;
  description: string | null;
  public_visible: boolean;
  sort_order: number;
  is_active: boolean;
};

type Branch = { id: string; name: string; code: string | null; is_main: boolean };

type PriceRow = {
  id?: string;
  service_id: string;
  price: string;
  estimated_minutes: string;
  min_quantity: string;
  show_public_price: boolean;
  show_public_estimate: boolean;
  is_active: boolean;
};

const serviceInit = {
  name: "",
  category_id: "",
  service_kind: "service",
  pricing_mode: "weight",
  unit_label: "kg",
  base_price: "",
  min_quantity: "0",
  estimated_minutes: "1440",
  description: "",
  public_visible: true,
  sort_order: "0",
};

const categoryInit = { name: "", description: "", sort_order: "0" };

function duration(minutes: number | null | undefined) {
  const value = Number(minutes || 0);
  if (!value) return "Tanpa estimasi";
  if (value % 1440 === 0) return `${value / 1440} hari`;
  if (value >= 60) return `${Math.round(value / 60)} jam`;
  return `${value} menit`;
}

export default function ServicesPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<"services" | "categories" | "prices">("services");
  const [tenantId, setTenantId] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [priceRows, setPriceRows] = useState<Record<string, PriceRow>>({});
  const [serviceForm, setServiceForm] = useState(serviceInit);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [categoryForm, setCategoryForm] = useState(categoryInit);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [msg, setMsg] = useState("");
  const [savingId, setSavingId] = useState("");

  async function loadBase() {
    const ctx = await getBrowserAppContext();
    if (!ctx) return;
    setTenantId(ctx.tenantId);

    const [{ data: serviceData }, { data: categoryData }, { data: branchData }] = await Promise.all([
      supabase
        .from("services")
        .select("id,name,category,category_id,service_kind,pricing_mode,unit_label,base_price,min_quantity,estimated_minutes,description,public_visible,sort_order,is_active")
        .eq("tenant_id", ctx.tenantId)
        .is("deleted_at", null)
        .order("sort_order")
        .order("name"),
      supabase
        .from("service_categories")
        .select("id,name,description,sort_order,is_active")
        .eq("tenant_id", ctx.tenantId)
        .is("deleted_at", null)
        .order("sort_order")
        .order("name"),
      supabase
        .from("branches")
        .select("id,name,code,is_main")
        .eq("tenant_id", ctx.tenantId)
        .eq("is_active", true)
        .order("is_main", { ascending: false })
        .order("name"),
    ]);

    setServices((serviceData ?? []) as Service[]);
    setCategories((categoryData ?? []) as Category[]);
    setBranches((branchData ?? []) as Branch[]);
    const preferred = selectedBranch || branchData?.[0]?.id || "";
    if (preferred) setSelectedBranch(preferred);
  }

  async function loadPrices(branchId = selectedBranch) {
    if (!branchId || !tenantId) return;
    const { data } = await supabase
      .from("branch_service_prices")
      .select("id,service_id,price,estimated_minutes,min_quantity,show_public_price,show_public_estimate,is_active")
      .eq("tenant_id", tenantId)
      .eq("branch_id", branchId);

    const byService = new Map((data ?? []).map((row: any) => [row.service_id, row]));
    const next: Record<string, PriceRow> = {};
    services.forEach((service) => {
      const row: any = byService.get(service.id);
      next[service.id] = {
        id: row?.id,
        service_id: service.id,
        price: String(row?.price ?? service.base_price ?? 0),
        estimated_minutes: String(row?.estimated_minutes ?? service.estimated_minutes ?? ""),
        min_quantity: String(row?.min_quantity ?? service.min_quantity ?? 0),
        show_public_price: row?.show_public_price ?? true,
        show_public_estimate: row?.show_public_estimate ?? true,
        is_active: row?.is_active ?? true,
      };
    });
    setPriceRows(next);
  }

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBranch && tenantId && services.length) loadPrices(selectedBranch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, tenantId, services.length]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || "";

  async function saveService(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    const category = categories.find((c) => c.id === serviceForm.category_id);
    const payload = {
      name: serviceForm.name.trim(),
      category_id: serviceForm.category_id || null,
      category: category?.name || null,
      service_kind: serviceForm.service_kind,
      pricing_mode: serviceForm.pricing_mode,
      unit_label: serviceForm.unit_label.trim() || "unit",
      base_price: Number(serviceForm.base_price || 0),
      min_quantity: Number(serviceForm.min_quantity || 0),
      estimated_minutes: serviceForm.estimated_minutes ? Number(serviceForm.estimated_minutes) : null,
      description: serviceForm.description.trim() || null,
      public_visible: serviceForm.public_visible,
      sort_order: Number(serviceForm.sort_order || 0),
    };

    const result = editingService
      ? await supabase.from("services").update(payload).eq("id", editingService.id)
      : await supabase.from("services").insert({ tenant_id: tenantId, ...payload });

    if (result.error) return setMsg(result.error.message);
    setServiceForm(serviceInit);
    setEditingService(null);
    setMsg("Layanan tersimpan.");
    await loadBase();
  }

  function editService(row: Service) {
    setEditingService(row);
    setServiceForm({
      name: row.name,
      category_id: row.category_id || "",
      service_kind: row.service_kind || "service",
      pricing_mode: row.pricing_mode,
      unit_label: row.unit_label,
      base_price: String(row.base_price),
      min_quantity: String(row.min_quantity || 0),
      estimated_minutes: String(row.estimated_minutes || ""),
      description: row.description || "",
      public_visible: row.public_visible !== false,
      sort_order: String(row.sort_order || 0),
    });
    setTab("services");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleService(row: Service) {
    await supabase.from("services").update({ is_active: !row.is_active }).eq("id", row.id);
    await loadBase();
  }

  async function archiveService(row: Service) {
    if (!confirm(`Arsipkan layanan “${row.name}”? Riwayat order lama tetap aman.`)) return;
    const { error } = await supabase.from("services").update({ deleted_at: new Date().toISOString(), is_active: false }).eq("id", row.id);
    if (error) return setMsg(error.message);
    setMsg("Layanan diarsipkan.");
    await loadBase();
  }

  async function saveCategory(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim() || null,
      sort_order: Number(categoryForm.sort_order || 0),
    };
    const result = editingCategory
      ? await supabase.from("service_categories").update(payload).eq("id", editingCategory.id)
      : await supabase.from("service_categories").insert({ tenant_id: tenantId, ...payload });
    if (result.error) return setMsg(result.error.message);

    if (editingCategory) {
      await supabase.from("services").update({ category: payload.name }).eq("category_id", editingCategory.id);
    }
    setCategoryForm(categoryInit);
    setEditingCategory(null);
    setMsg("Kategori tersimpan.");
    await loadBase();
  }

  async function toggleCategory(row: Category) {
    await supabase.from("service_categories").update({ is_active: !row.is_active }).eq("id", row.id);
    await loadBase();
  }

  async function archiveCategory(row: Category) {
    const linked = services.filter((s) => s.category_id === row.id).length;
    if (linked > 0) return setMsg(`Kategori masih dipakai ${linked} layanan. Pindahkan layanan dulu sebelum mengarsipkan kategori.`);
    if (!confirm(`Arsipkan kategori “${row.name}”?`)) return;
    const { error } = await supabase.from("service_categories").update({ deleted_at: new Date().toISOString(), is_active: false }).eq("id", row.id);
    if (error) return setMsg(error.message);
    setMsg("Kategori diarsipkan.");
    await loadBase();
  }

  function patchPrice(serviceId: string, patch: Partial<PriceRow>) {
    setPriceRows((current) => ({
      ...current,
      [serviceId]: { ...current[serviceId], ...patch },
    }));
  }

  async function saveBranchPrice(service: Service) {
    const row = priceRows[service.id];
    if (!row || !selectedBranch) return;
    setSavingId(service.id);
    setMsg("");
    const payload = {
      tenant_id: tenantId,
      branch_id: selectedBranch,
      service_id: service.id,
      price: Number(row.price || 0),
      estimated_minutes: row.estimated_minutes ? Number(row.estimated_minutes) : null,
      min_quantity: Number(row.min_quantity || 0),
      show_public_price: row.show_public_price,
      show_public_estimate: row.show_public_estimate,
      is_active: row.is_active,
    };
    const result = row.id
      ? await supabase.from("branch_service_prices").update(payload).eq("id", row.id)
      : await supabase.from("branch_service_prices").insert(payload);
    setSavingId("");
    if (result.error) return setMsg(result.error.message);
    setMsg(`Harga ${service.name} tersimpan untuk cabang terpilih.`);
    await loadPrices();
  }

  const activeServices = useMemo(() => services.filter((s) => s.is_active).length, [services]);
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    services.forEach((service) => {
      if (service.category_id) map[service.category_id] = (map[service.category_id] || 0) + 1;
    });
    return map;
  }, [services]);

  const tabButton = (value: typeof tab, label: string, icon: ReactNode) => (
    <button
      onClick={() => setTab(value)}
      className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
        tab === value ? "text-white shadow-lg" : "bg-white/60 text-slate-600 hover:bg-white"
      }`}
      style={tab === value ? { backgroundImage: "linear-gradient(90deg,var(--brand-primary),var(--brand-secondary))" } : undefined}
    >
      {icon}{label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="content-kicker"><Sparkles size={14}/> SERVICE & PACKAGE MASTER</div>
          <h1 className="page-title mt-2">Layanan, Paket & Harga Cabang</h1>
          <p className="muted mt-1">Satu master layanan, harga dan estimasi bisa berbeda di setiap cabang.</p>
        </div>
        <div className="flex gap-3">
          <div className="theme-card theme-card-2 px-4 py-3"><div className="text-xs font-bold text-slate-500">Aktif</div><div className="text-xl font-black">{activeServices}</div></div>
          <div className="theme-card theme-card-4 px-4 py-3"><div className="text-xs font-bold text-slate-500">Kategori</div><div className="text-xl font-black">{categories.length}</div></div>
        </div>
      </div>

      <div className="premium-toolbar flex flex-wrap gap-2 p-2">
        {tabButton("services", "Layanan & Paket", <PackageCheck size={17}/>)}
        {tabButton("categories", "Kategori", <Tags size={17}/>)}
        {tabButton("prices", "Harga Per Cabang", <Coins size={17}/>)}
      </div>

      {msg && <div className="rounded-2xl bg-sky-50/90 p-4 text-sm font-semibold text-sky-700 ring-1 ring-sky-100">{msg}</div>}

      {tab === "services" && (
        <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
          <form onSubmit={saveService} className="premium-panel h-fit p-5 xl:sticky xl:top-24">
            <div className="premium-form-head flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Sparkles size={19}/></div><div><h2 className="section-title">{editingService ? "Edit Layanan" : "Tambah Layanan / Paket"}</h2><p className="text-xs text-slate-500">Harga dasar menjadi fallback jika cabang belum punya harga khusus.</p></div></div>
              {editingService && <button type="button" onClick={() => { setEditingService(null); setServiceForm(serviceInit); }} className="rounded-xl bg-white/70 p-2"><X size={18}/></button>}
            </div>
            <div className="space-y-3">
              <div><label className="label">Nama Layanan / Paket</label><input className="input" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="Contoh: Cuci Setrika Express" required/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Kategori</label><select className="input" value={serviceForm.category_id} onChange={(e) => setServiceForm({ ...serviceForm, category_id: e.target.value })}><option value="">Tanpa kategori</option>{categories.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="label">Jenis</label><select className="input" value={serviceForm.service_kind} onChange={(e) => setServiceForm({ ...serviceForm, service_kind: e.target.value })}><option value="service">Layanan</option><option value="package">Paket</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Model Harga</label><select className="input" value={serviceForm.pricing_mode} onChange={(e) => { const value = e.target.value; setServiceForm({ ...serviceForm, pricing_mode: value, unit_label: value === "weight" ? "kg" : value === "unit" ? "pcs" : value === "flat" ? "order" : "paket" }); }}><option value="weight">Per Berat</option><option value="unit">Per Unit</option><option value="package">Paket</option><option value="flat">Flat</option></select></div>
                <div><label className="label">Satuan</label><input className="input" value={serviceForm.unit_label} onChange={(e) => setServiceForm({ ...serviceForm, unit_label: e.target.value })} placeholder="kg / pcs / paket"/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Harga Dasar</label><div className="relative"><Coins className="absolute left-3 top-3 text-slate-400" size={16}/><input className="input pl-9" type="number" min="0" value={serviceForm.base_price} onChange={(e) => setServiceForm({ ...serviceForm, base_price: e.target.value })} required/></div></div>
                <div><label className="label">Minimum Qty</label><div className="relative"><Scale className="absolute left-3 top-3 text-slate-400" size={16}/><input className="input pl-9" type="number" step="0.1" min="0" value={serviceForm.min_quantity} onChange={(e) => setServiceForm({ ...serviceForm, min_quantity: e.target.value })}/></div></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Estimasi (menit)</label><div className="relative"><Clock3 className="absolute left-3 top-3 text-slate-400" size={16}/><input className="input pl-9" type="number" min="0" value={serviceForm.estimated_minutes} onChange={(e) => setServiceForm({ ...serviceForm, estimated_minutes: e.target.value })}/></div></div>
                <div><label className="label">Urutan</label><input className="input" type="number" value={serviceForm.sort_order} onChange={(e) => setServiceForm({ ...serviceForm, sort_order: e.target.value })}/></div>
              </div>
              <div><label className="label">Deskripsi</label><textarea className="input min-h-20" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} placeholder="Detail layanan untuk kasir dan homepage"/></div>
              <label className="flex items-center justify-between rounded-2xl bg-white/60 p-3 text-sm font-bold"><span>Tampilkan di homepage nanti</span><input type="checkbox" checked={serviceForm.public_visible} onChange={(e) => setServiceForm({ ...serviceForm, public_visible: e.target.checked })} className="h-5 w-5 accent-violet-600"/></label>
              <button className="btn-primary w-full gap-2">{editingService ? <Pencil size={16}/> : <Plus size={16}/>} {editingService ? "Update Layanan" : "Simpan Layanan"}</button>
            </div>
          </form>

          <section className="premium-panel p-4">
            <div className="mb-4 flex items-center justify-between"><div><div className="font-black text-slate-900">Katalog Layanan & Paket</div><div className="text-xs text-slate-500">Paket dan layanan memakai master yang sama supaya kasir lebih simpel.</div></div><div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/60 text-[var(--brand-primary)]"><Boxes size={18}/></div></div>
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {services.map((row, index) => (
                <div key={row.id} className={`theme-card theme-card-${(index % 8) + 1} relative overflow-hidden p-5 ${!row.is_active ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/65 text-[var(--brand-primary)]"><PackageCheck size={18}/></div><div className="flex gap-1"><span className="badge-info">{row.service_kind === "package" ? "Paket" : "Layanan"}</span><span className={row.is_active ? "badge-success" : "badge-neutral"}>{row.is_active ? "Aktif" : "Off"}</span></div></div>
                  <div className="mt-4 text-lg font-black">{row.name}</div>
                  <div className="mt-1 text-xs font-medium text-slate-500">{row.category_id ? categoryName(row.category_id) : row.category || "Tanpa kategori"} • {row.unit_label}</div>
                  <div className="mt-4 text-2xl font-black">{rupiah(row.base_price)}<span className="ml-1 text-xs text-slate-500">/{row.unit_label}</span></div>
                  <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/55 p-2.5"><div className="text-[10px] font-bold uppercase text-slate-400">Minimum</div><div className="text-sm font-black">{row.min_quantity || 0} {row.unit_label}</div></div><div className="rounded-xl bg-white/55 p-2.5"><div className="text-[10px] font-bold uppercase text-slate-400">Estimasi</div><div className="text-sm font-black">{duration(row.estimated_minutes)}</div></div></div>
                  {row.description && <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{row.description}</p>}
                  <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2"><button onClick={() => editService(row)} className="btn-secondary gap-1 !px-3 !py-2 text-sm"><Pencil size={14}/> Edit</button><button onClick={() => toggleService(row)} className="btn-secondary !px-3 !py-2" title="Aktif/nonaktif"><Power size={15}/></button><button onClick={() => archiveService(row)} className="btn-secondary !px-3 !py-2 text-rose-600" title="Arsipkan"><Archive size={15}/></button></div>
                </div>
              ))}
              {!services.length && <div className="premium-empty sm:col-span-2 2xl:col-span-3">Belum ada layanan. Tambahkan layanan pertama dari form di kiri.</div>}
            </div>
          </section>
        </div>
      )}

      {tab === "categories" && (
        <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
          <form onSubmit={saveCategory} className="premium-panel h-fit p-5">
            <div className="premium-form-head flex items-center justify-between"><div className="flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Tags size={18}/></div><div><h2 className="section-title">{editingCategory ? "Edit Kategori" : "Tambah Kategori"}</h2><p className="text-xs text-slate-500">Contoh Kiloan, Satuan, Bedding, Sepatu.</p></div></div>{editingCategory && <button type="button" className="rounded-xl bg-white/70 p-2" onClick={() => { setEditingCategory(null); setCategoryForm(categoryInit); }}><X size={18}/></button>}</div>
            <div className="space-y-3"><div><label className="label">Nama Kategori</label><input className="input" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required/></div><div><label className="label">Deskripsi</label><textarea className="input min-h-24" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}/></div><div><label className="label">Urutan</label><input className="input" type="number" value={categoryForm.sort_order} onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: e.target.value })}/></div><button className="btn-primary w-full gap-2"><Save size={16}/> Simpan Kategori</button></div>
          </form>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {categories.map((row, index) => <div key={row.id} className={`theme-card theme-card-${(index % 8) + 1} p-5 ${!row.is_active ? "opacity-60" : ""}`}><div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/65 text-[var(--brand-primary)]"><Tags size={18}/></div><span className={row.is_active ? "badge-success" : "badge-neutral"}>{row.is_active ? "Aktif" : "Off"}</span></div><div className="mt-4 text-lg font-black">{row.name}</div><div className="mt-1 text-sm text-slate-500">{row.description || "Tanpa deskripsi"}</div><div className="mt-4 rounded-xl bg-white/55 p-3"><div className="text-xs text-slate-400">Layanan dalam kategori</div><div className="text-xl font-black">{categoryCounts[row.id] || 0}</div></div><div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2"><button className="btn-secondary gap-1 !px-3 !py-2 text-sm" onClick={() => { setEditingCategory(row); setCategoryForm({ name: row.name, description: row.description || "", sort_order: String(row.sort_order || 0) }); }}><Pencil size={14}/> Edit</button><button className="btn-secondary !px-3 !py-2" onClick={() => toggleCategory(row)}><Power size={15}/></button><button className="btn-secondary !px-3 !py-2 text-rose-600" onClick={() => archiveCategory(row)}><Archive size={15}/></button></div></div>)}
          </div>
        </div>
      )}

      {tab === "prices" && (
        <div className="space-y-5">
          <div className="premium-toolbar grid gap-3 p-4 md:grid-cols-[260px_1fr] md:items-center">
            <div><label className="label">Cabang</label><select className="input" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.is_main ? " • Utama" : ""}</option>)}</select></div>
            <div className="rounded-2xl bg-white/55 p-4 text-sm text-slate-600"><b>Harga per cabang:</b> kasir otomatis memakai harga ini. Jika belum pernah disimpan, sistem memakai harga dasar layanan. Estimasi juga bisa dioverride per cabang.</div>
          </div>
          <div className="premium-panel overflow-hidden p-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead><tr><th className="p-4 text-left">Layanan</th><th className="p-4 text-left">Harga Cabang</th><th className="p-4 text-left">Minimum</th><th className="p-4 text-left">Estimasi</th><th className="p-4 text-center">Harga Publik</th><th className="p-4 text-center">Estimasi Publik</th><th className="p-4 text-center">Aktif</th><th className="p-4"></th></tr></thead>
                <tbody>{services.map((service) => { const row = priceRows[service.id]; if (!row) return null; return <tr key={service.id}><td className="p-4"><div className="font-black">{service.name}</div><div className="text-xs text-slate-400">{service.category_id ? categoryName(service.category_id) : service.category || "Tanpa kategori"} • dasar {rupiah(service.base_price)}</div></td><td className="p-3"><input className="input min-w-36" type="number" min="0" value={row.price} onChange={(e) => patchPrice(service.id, { price: e.target.value })}/></td><td className="p-3"><input className="input w-28" type="number" step="0.1" min="0" value={row.min_quantity} onChange={(e) => patchPrice(service.id, { min_quantity: e.target.value })}/></td><td className="p-3"><input className="input w-32" type="number" min="0" value={row.estimated_minutes} onChange={(e) => patchPrice(service.id, { estimated_minutes: e.target.value })}/><div className="mt-1 text-[10px] text-slate-400">{duration(Number(row.estimated_minutes || 0))}</div></td><td className="p-4 text-center"><input type="checkbox" className="h-5 w-5 accent-violet-600" checked={row.show_public_price} onChange={(e) => patchPrice(service.id, { show_public_price: e.target.checked })}/></td><td className="p-4 text-center"><input type="checkbox" className="h-5 w-5 accent-violet-600" checked={row.show_public_estimate} onChange={(e) => patchPrice(service.id, { show_public_estimate: e.target.checked })}/></td><td className="p-4 text-center"><input type="checkbox" className="h-5 w-5 accent-violet-600" checked={row.is_active} onChange={(e) => patchPrice(service.id, { is_active: e.target.checked })}/></td><td className="p-3"><button onClick={() => saveBranchPrice(service)} className="btn-primary gap-2 !px-3 !py-2 text-sm" disabled={savingId === service.id}><Save size={14}/>{savingId === service.id ? "..." : "Simpan"}</button></td></tr>; })}</tbody>
              </table>
            </div>
            {!services.length && <div className="premium-empty">Belum ada layanan untuk diberi harga cabang.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
