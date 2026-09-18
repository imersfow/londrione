"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getBrowserAppContext } from "@/lib/browser-context";
import { rupiah } from "@/lib/ui";
import { Ban, Edit3, FolderPlus, Plus, ReceiptText, Search, Save, Tags, Trash2, X } from "lucide-react";

export default function ExpensesPage() {
  const [ctx, setCtx] = useState<any>(null);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [tab, setTab] = useState<"transactions" | "categories">("transactions");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [newCategory, setNewCategory] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const app = await getBrowserAppContext();
      if (!app) return;
      setCtx(app);
      setBranches(app.branches ?? []);
      if (app.branches?.[0]?.id) setBranchId(app.branches[0].id);
      await loadCategories(app);
    })();
  }, []);

  async function loadCategories(app = ctx) {
    if (!app) return;
    const { data } = await app.supabase
      .from("expense_categories")
      .select("id,name,description,is_active,sort_order,created_at")
      .eq("tenant_id", app.tenantId)
      .is("deleted_at", null)
      .order("sort_order")
      .order("name");
    const list = data ?? [];
    setCategories(list);
    if (!categoryId && list.find((x: any) => x.is_active)?.id) setCategoryId(list.find((x: any) => x.is_active).id);
  }

  async function loadRows() {
    if (!ctx || !branchId) return;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query: any = ctx.supabase
      .from("expenses")
      .select("id,expense_date,category,category_id,description,amount,payment_method,reference_no,receipt_url,status,created_at,expense_categories(name)", { count: "exact" })
      .eq("tenant_id", ctx.tenantId)
      .eq("branch_id", branchId)
      .is("deleted_at", null)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (filterCategory !== "all") query = query.eq("category_id", filterCategory);
    if (search.trim()) query = query.ilike("description", `%${search.trim()}%`);
    const { data, count } = await query.range(from, to);
    setRows(data ?? []);
    setTotalCount(count ?? 0);
  }

  useEffect(() => { if (ctx && branchId) loadRows(); }, [ctx, branchId, page, pageSize, filterCategory]);

  async function addExpense(e: FormEvent) {
    e.preventDefault();
    if (!ctx || !branchId || !categoryId) return;
    const category = categories.find((c) => c.id === categoryId);
    setMessage("");
    const { error } = await ctx.supabase.from("expenses").insert({
      tenant_id: ctx.tenantId,
      branch_id: branchId,
      category_id: categoryId,
      category: category?.name || "Lain-lain",
      description: description.trim(),
      amount: Number(amount),
      payment_method: method,
      reference_no: reference.trim() || null,
      receipt_url: receiptUrl.trim() || null,
    });
    if (error) return setMessage(error.message);
    setDescription(""); setAmount(""); setReference(""); setReceiptUrl(""); setPage(1);
    await loadRows();
  }

  async function voidExpense(id: string) {
    if (!ctx) return;
    await ctx.supabase.from("expenses").update({ status: "void", voided_at: new Date().toISOString() }).eq("id", id);
    await loadRows();
  }

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    if (!ctx || !newCategory.trim()) return;
    const { error } = await ctx.supabase.from("expense_categories").insert({ tenant_id: ctx.tenantId, name: newCategory.trim(), sort_order: categories.length * 10 + 10 });
    if (error) return setMessage(error.message);
    setNewCategory(""); await loadCategories();
  }

  async function saveCategory(id: string) {
    if (!ctx || !editingName.trim()) return;
    const { error } = await ctx.supabase.from("expense_categories").update({ name: editingName.trim() }).eq("id", id);
    if (error) return setMessage(error.message);
    setEditingId(""); setEditingName(""); await loadCategories(); await loadRows();
  }

  async function toggleCategory(row: any) {
    if (!ctx) return;
    await ctx.supabase.from("expense_categories").update({ is_active: !row.is_active }).eq("id", row.id);
    await loadCategories();
  }

  async function removeCategory(id: string) {
    if (!ctx) return;
    await ctx.supabase.from("expense_categories").update({ deleted_at: new Date().toISOString(), is_active: false }).eq("id", id);
    await loadCategories();
  }

  const totalVisible = rows.filter((r) => r.status === "posted").reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const role = String(ctx?.membership?.role || "");
  const canDeleteCategory = ["owner", "admin"].includes(role);
  const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories]);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><div className="content-kicker"><ReceiptText size={14}/> FINANCE</div><h1 className="page-title mt-2">Pengeluaran</h1><p className="muted mt-1">Transaksi biaya dan master kategori per bisnis.</p></div>
      <div className="theme-card theme-card-3 px-4 py-3 text-right"><div className="text-xs font-semibold text-slate-500">Total halaman ini</div><div className="text-xl font-black">{rupiah(totalVisible)}</div></div>
    </div>

    <div className="flex gap-2 rounded-2xl bg-white/55 p-1.5 ring-1 ring-white/80 w-fit">
      <button onClick={()=>setTab("transactions")} className={tab==="transactions"?"btn-primary !py-2":"btn-secondary !py-2"}>Transaksi</button>
      <button onClick={()=>setTab("categories")} className={tab==="categories"?"btn-primary !py-2":"btn-secondary !py-2"}><Tags size={15}/> Kategori Pengeluaran</button>
    </div>

    {message && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-600">{message}</div>}

    {tab === "transactions" ? <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
      <form onSubmit={addExpense} className="premium-panel h-fit p-5">
        <div className="premium-form-head flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Plus size={18}/></div><div><h2 className="section-title">Catat Pengeluaran</h2><p className="text-xs text-slate-500">Otomatis ikut shift kasir aktif jika ada.</p></div></div>
        <div className="space-y-3">
          <select className="input" value={branchId} onChange={e=>{setBranchId(e.target.value);setPage(1)}}>{branches.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <select className="input" value={categoryId} onChange={e=>setCategoryId(e.target.value)} required><option value="">Pilih kategori</option>{activeCategories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input className="input" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Keterangan" required/>
          <input className="input" type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Nominal" required/>
          <select className="input" value={method} onChange={e=>setMethod(e.target.value)}><option value="cash">Cash</option><option value="bank_transfer">Transfer</option><option value="qris">QRIS</option><option value="ewallet">E-Wallet</option><option value="other">Lainnya</option></select>
          <input className="input" value={reference} onChange={e=>setReference(e.target.value)} placeholder="Nomor referensi (opsional)"/>
          <input className="input" value={receiptUrl} onChange={e=>setReceiptUrl(e.target.value)} placeholder="URL bukti/nota (opsional)"/>
          <button className="btn-primary w-full gap-2"><Plus size={16}/> Simpan Pengeluaran</button>
        </div>
      </form>

      <div className="premium-panel overflow-hidden">
        <div className="grid gap-3 border-b border-white/70 p-4 md:grid-cols-[1fr_210px_120px]">
          <div className="relative"><Search size={17} className="absolute left-3 top-3.5 text-slate-400"/><input className="input pl-10" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){setPage(1);loadRows()}}} placeholder="Cari keterangan..."/></div>
          <select className="input" value={filterCategory} onChange={e=>{setFilterCategory(e.target.value);setPage(1)}}><option value="all">Semua kategori</option>{categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select className="input" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}}><option value={10}>10 / hal</option><option value={25}>25 / hal</option><option value={50}>50 / hal</option></select>
        </div>
        <div className="space-y-2 p-3">{rows.map((r:any,index:number)=><div key={r.id} className={`theme-card theme-card-${(index%8)+1} flex items-center gap-3 p-4 ${r.status==="void"?"opacity-50":""}`}><div className="brand-gradient grid h-10 w-10 place-items-center rounded-xl text-white"><ReceiptText size={18}/></div><div className="min-w-0 flex-1"><div className="truncate font-bold">{r.description}</div><div className="text-xs text-slate-500">{r.expense_date} • {r.expense_categories?.name || r.category} • {r.payment_method}</div>{r.reference_no&&<div className="text-xs text-slate-400">Ref: {r.reference_no}</div>}</div><div className="text-right"><div className="font-black">{rupiah(r.amount)}</div><span className={r.status==="posted"?"badge-success":"badge-neutral"}>{r.status}</span></div>{r.receipt_url&&<a href={r.receipt_url} target="_blank" className="btn-secondary !p-2" title="Bukti"><ReceiptText size={16}/></a>}{r.status==="posted"&&<button onClick={()=>voidExpense(r.id)} className="rounded-xl bg-white/60 p-2 text-rose-600 hover:bg-rose-50" title="Void"><Ban size={17}/></button>}</div>)}{!rows.length&&<div className="rounded-3xl bg-white/45 p-12 text-center text-sm text-slate-400">Belum ada pengeluaran sesuai filter.</div>}</div>
        <div className="flex items-center justify-between border-t border-white/70 p-4 text-sm"><span>Total {totalCount} data • Halaman {page} dari {totalPages}</span><div className="flex gap-2"><button className="btn-secondary !px-3 !py-2" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button><button className="btn-secondary !px-3 !py-2" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>›</button></div></div>
      </div>
    </div> : <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <form onSubmit={addCategory} className="premium-panel h-fit p-5"><div className="premium-form-head flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><FolderPlus size={18}/></div><div><h2 className="section-title">Kategori Pengeluaran</h2><p className="text-xs text-slate-500">Dipakai di transaksi dan laporan laba rugi.</p></div></div><input className="input" value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="Contoh: Listrik" required/><button className="btn-primary mt-3 w-full gap-2"><FolderPlus size={16}/> Tambah Kategori</button></form>
      <div className="premium-panel p-3"><div className="space-y-2">{categories.map((row:any,index:number)=><div key={row.id} className={`theme-card theme-card-${(index%8)+1} flex flex-wrap items-center gap-3 p-4 ${!row.is_active?"opacity-60":""}`}>{editingId===row.id?<input className="input min-w-[220px] flex-1" value={editingName} onChange={e=>setEditingName(e.target.value)}/>:<div className="min-w-[220px] flex-1"><div className="font-black">{row.name}</div><div className="text-xs text-slate-500">{row.is_active?"Aktif":"Nonaktif"}</div></div>}{editingId===row.id?<><button className="btn-primary !p-2" onClick={()=>saveCategory(row.id)}><Save size={16}/></button><button className="btn-secondary !p-2" onClick={()=>{setEditingId("");setEditingName("")}}><X size={16}/></button></>:<><button className="btn-secondary !p-2" onClick={()=>{setEditingId(row.id);setEditingName(row.name)}}><Edit3 size={16}/></button><button className="btn-secondary !py-2 text-xs" onClick={()=>toggleCategory(row)}>{row.is_active?"Nonaktifkan":"Aktifkan"}</button>{canDeleteCategory&&<button className="rounded-xl bg-white/60 p-2 text-rose-600" onClick={()=>removeCategory(row.id)}><Trash2 size={16}/></button>}</>}</div>)}{!categories.length&&<div className="p-10 text-center text-sm text-slate-400">Belum ada kategori.</div>}</div></div>
    </div>}
  </div>;
}
