"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getBrowserAppContext } from "@/lib/browser-context";
import { dateTime, rupiah } from "@/lib/ui";
import { Banknote, CheckCircle2, Clock3, RefreshCw, Search, Store, WalletCards } from "lucide-react";

export default function ShiftsPage() {
  const [ctx, setCtx] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("");
  const [openShift, setOpenShift] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string,string>>({});
  const [label, setLabel] = useState("Shift Pagi");
  const [openingCash, setOpeningCash] = useState("0");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const app = await getBrowserAppContext();
      if (!app) return;
      setCtx(app); setBranches(app.branches ?? []);
      if (app.branches?.[0]?.id) setBranchId(app.branches[0].id);
    })();
  }, []);

  async function load() {
    if (!ctx || !branchId) return;
    setLoading(true); setMessage("");
    const from = (page-1)*pageSize, to = from+pageSize-1;
    let q:any = ctx.supabase.from("cash_shifts")
      .select("*", { count:"exact" })
      .eq("tenant_id",ctx.tenantId).eq("branch_id",branchId)
      .order("opened_at",{ascending:false});
    if (search.trim()) q=q.ilike("shift_label",`%${search.trim()}%`);
    const [{data:open,error:openError},{data:hist,count:histCount,error:histError}] = await Promise.all([
      ctx.supabase.from("cash_shifts").select("*").eq("tenant_id",ctx.tenantId).eq("branch_id",branchId).eq("status","open").maybeSingle(),
      q.range(from,to),
    ]);
    if(openError||histError) setMessage(openError?.message||histError?.message||"");
    let current=open??null;
    if(current){
      const {data:fresh}=await ctx.supabase.rpc("refresh_cash_shift_snapshot",{p_shift_id:current.id});
      if(fresh) current=fresh;
    }
    setOpenShift(current); setHistory(hist??[]); setCount(histCount??0);
    const ids=[...new Set((hist??[]).flatMap((r:any)=>[r.opened_by,r.closed_by]).filter(Boolean))];
    if(ids.length){
      const {data:p}=await ctx.supabase.from("profiles").select("id,full_name").in("id",ids);
      setProfiles(Object.fromEntries((p??[]).map((x:any)=>[x.id,x.full_name||"Staff"])));
    }
    setLoading(false);
  }

  useEffect(()=>{ if(ctx&&branchId) load(); },[ctx,branchId,page,pageSize]);

  async function open(e:FormEvent){
    e.preventDefault(); if(!ctx||!branchId)return; setMessage("");
    const {error}=await ctx.supabase.rpc("open_cash_shift",{p_branch_id:branchId,p_shift_label:label,p_opening_cash:Number(openingCash||0)});
    if(error)return setMessage(error.message);
    setOpeningCash("0"); await load();
  }

  async function refresh(){
    if(!ctx||!openShift)return;
    const {data,error}=await ctx.supabase.rpc("refresh_cash_shift_snapshot",{p_shift_id:openShift.id});
    if(error)return setMessage(error.message);
    if(data)setOpenShift(data);
  }

  async function close(e:FormEvent){
    e.preventDefault(); if(!ctx||!openShift)return; setMessage("");
    const val=Number(actualCash||0);
    const {error}=await ctx.supabase.rpc("close_cash_shift",{p_shift_id:openShift.id,p_closing_cash_actual:val,p_notes:notes||null});
    if(error)return setMessage(error.message);
    setActualCash("");setNotes(""); await load();
  }

  const expected=Number(openShift?.expected_cash||0);
  const previewDifference=actualCash===""?null:Number(actualCash||0)-expected;
  const totalPages=Math.max(1,Math.ceil(count/pageSize));
  const currentBranch=useMemo(()=>branches.find((b:any)=>b.id===branchId),[branches,branchId]);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="content-kicker"><Clock3 size={14}/> CASHIER SHIFT</div><h1 className="page-title mt-2">Shift Kasir & Closing</h1><p className="muted mt-1">Kas awal, transaksi shift, uang fisik, dan selisih kas per cabang.</p></div><select className="input !w-auto min-w-[220px]" value={branchId} onChange={e=>{setBranchId(e.target.value);setPage(1)}}>{branches.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
    {message&&<div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-600">{message}</div>}

    {!loading && !openShift ? <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <form onSubmit={open} className="premium-panel p-5"><div className="premium-form-head flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Store size={18}/></div><div><h2 className="section-title">Buka Shift</h2><p className="text-xs text-slate-500">Satu shift aktif per cabang agar kas tetap mudah direkonsiliasi.</p></div></div><div className="space-y-3"><select className="input" value={label} onChange={e=>setLabel(e.target.value)}><option>Shift Pagi</option><option>Shift Sore</option><option>Shift Malam</option><option>Shift Custom</option></select><div><label className="label">Kas Awal</label><input className="input" type="number" min="0" value={openingCash} onChange={e=>setOpeningCash(e.target.value)}/></div><button className="btn-primary w-full gap-2"><Clock3 size={16}/> Buka Shift {currentBranch?.name||""}</button></div></form>
      <div className="theme-card theme-card-2 p-6"><div className="text-xs font-black uppercase tracking-widest text-slate-500">Belum Ada Shift Aktif</div><div className="mt-3 text-3xl font-black">Kasir siap mulai</div><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Begitu shift dibuka, order, pembayaran dan pengeluaran baru di cabang ini otomatis tertaut ke shift. Closing menghitung expected cash dan selisih kas otomatis.</p></div>
    </div> : openShift ? <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
      <div className="space-y-4">
        <div className="theme-card theme-card-1 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-wider text-emerald-700">Shift Aktif</div><div className="mt-1 text-2xl font-black">{openShift.shift_label}</div><div className="mt-1 text-sm text-slate-500">Dibuka {dateTime(openShift.opened_at)} • {profiles[openShift.opened_by]||"Staff"}</div></div><button onClick={refresh} className="btn-secondary gap-2"><RefreshCw size={16}/> Refresh Rekap</button></div></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Kas Awal" value={rupiah(openShift.opening_cash)} index={1}/><Metric label="Cash Masuk" value={rupiah(openShift.cash_sales)} index={2}/><Metric label="Cash Expense" value={rupiah(openShift.cash_expenses)} index={3}/><Metric label="Expected Cash" value={rupiah(openShift.expected_cash)} index={4}/>
          <Metric label="Transfer" value={rupiah(openShift.transfer_sales)} index={5}/><Metric label="QRIS" value={rupiah(openShift.qris_sales)} index={6}/><Metric label="E-Wallet" value={rupiah(openShift.ewallet_sales)} index={7}/><Metric label="Order Shift" value={String(openShift.order_count||0)} index={8}/>
        </div>
      </div>
      <form onSubmit={close} className="premium-panel h-fit p-5"><div className="premium-form-head flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white"><Banknote size={18}/></div><div><h2 className="section-title">Closing Shift</h2><p className="text-xs text-slate-500">Hitung uang cash fisik setelah transaksi terakhir.</p></div></div><label className="label">Cash Aktual di Laci</label><input className="input" type="number" min="0" value={actualCash} onChange={e=>setActualCash(e.target.value)} placeholder={String(Math.round(expected))}/>{previewDifference!==null&&<div className={`mt-3 rounded-2xl p-3 text-sm font-bold ${previewDifference===0?"bg-emerald-50 text-emerald-700":previewDifference>0?"bg-sky-50 text-sky-700":"bg-rose-50 text-rose-700"}`}>Perkiraan selisih: {rupiah(previewDifference)}</div>}<textarea className="input mt-3 min-h-[90px]" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Catatan closing (opsional)"/><button className="btn-primary mt-3 w-full gap-2"><CheckCircle2 size={16}/> Tutup & Closing Shift</button></form>
    </div> : <div className="muted">Memuat shift...</div>}

    <div className="premium-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/70 p-4"><div><h2 className="section-title">Riwayat Shift</h2><p className="text-xs text-slate-500">Audit buka/tutup shift per cabang.</p></div><div className="flex gap-2"><div className="relative"><Search size={16} className="absolute left-3 top-3.5 text-slate-400"/><input className="input !w-[220px] pl-9" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){setPage(1);load()}}} placeholder="Cari nama shift..."/></div><select className="input !w-auto" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}}><option value={10}>10 / hal</option><option value={25}>25 / hal</option><option value={50}>50 / hal</option></select></div></div>
      <div className="space-y-2 p-3">{history.map((row:any,index:number)=><div key={row.id} className={`theme-card theme-card-${(index%8)+1} grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center`}><div><div className="flex items-center gap-2"><b>{row.shift_label}</b><span className={row.status==="open"?"badge-info":"badge-success"}>{row.status}</span></div><div className="mt-1 text-xs text-slate-500">{dateTime(row.opened_at)} → {row.closed_at?dateTime(row.closed_at):"Masih aktif"}</div><div className="text-xs text-slate-400">Kasir: {profiles[row.opened_by]||"Staff"}</div></div><div className="text-sm"><span className="text-slate-500">Collected</span><br/><b>{rupiah(row.total_collected)}</b></div><div className="text-right text-sm"><span className="text-slate-500">Selisih Kas</span><br/><b className={Number(row.cash_difference||0)<0?"text-rose-600":Number(row.cash_difference||0)>0?"text-sky-600":"text-emerald-600"}>{row.status==="closed"?rupiah(row.cash_difference):"-"}</b></div></div>)}{!history.length&&<div className="p-10 text-center text-sm text-slate-400">Belum ada histori shift.</div>}</div>
      <div className="flex items-center justify-between border-t border-white/70 p-4 text-sm"><span>Total {count} shift • Halaman {page} dari {totalPages}</span><div className="flex gap-2"><button className="btn-secondary !px-3 !py-2" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button><button className="btn-secondary !px-3 !py-2" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>›</button></div></div>
    </div>
  </div>;
}

function Metric({label,value,index}:{label:string;value:string;index:number}){return <div className={`theme-card theme-card-${index} p-4`}><div className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-xl font-black">{value}</div></div>}
