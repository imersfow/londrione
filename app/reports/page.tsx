"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserAppContext } from "@/lib/browser-context";
import { dateTime, rupiah } from "@/lib/ui";
import { exportExcelHtml, printReport } from "@/lib/report-export";
import { BarChart3, Banknote, Download, FileSpreadsheet, Filter, Printer, RefreshCw, TrendingDown, TrendingUp, WalletCards } from "lucide-react";

const today=()=>new Date().toISOString().slice(0,10);
const monthStart=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`};

export default function ReportsPage(){
  const[ctx,setCtx]=useState<any>(null),[branches,setBranches]=useState<any[]>([]),[branchId,setBranchId]=useState("all"),[from,setFrom]=useState(monthStart()),[to,setTo]=useState(today()),[summary,setSummary]=useState<any>(null),[orders,setOrders]=useState<any[]>([]),[expenses,setExpenses]=useState<any[]>([]),[payments,setPayments]=useState<any[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[search,setSearch]=useState(""),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(20);

  useEffect(()=>{(async()=>{const app=await getBrowserAppContext();if(!app)return;setCtx(app);setBranches(app.branches??[]);})();},[]);
  useEffect(()=>{if(ctx)load()},[ctx,branchId,from,to]);

  async function load(){
    if(!ctx)return;setLoading(true);setMessage("");
    const branch=branchId==="all"?null:branchId;
    const start=new Date(`${from}T00:00:00+07:00`).toISOString();
    const untilDate=new Date(`${to}T00:00:00+07:00`);untilDate.setDate(untilDate.getDate()+1);const until=untilDate.toISOString();
    const summaryReq=ctx.supabase.rpc("finance_report_summary",{p_tenant_id:ctx.tenantId,p_branch_id:branch,p_date_from:from,p_date_to:to});
    let oq:any=ctx.supabase.from("orders").select("id,order_number,customer_name,status,grand_total,discount_amount,paid_amount,balance_due,created_at,branch_id,branches(name)").eq("tenant_id",ctx.tenantId).gte("created_at",start).lt("created_at",until).is("deleted_at",null).order("created_at",{ascending:false});
    let eq:any=ctx.supabase.from("expenses").select("id,expense_date,description,amount,payment_method,status,branch_id,expense_categories(name),branches(name)").eq("tenant_id",ctx.tenantId).gte("expense_date",from).lte("expense_date",to).eq("status","posted").is("deleted_at",null).order("expense_date",{ascending:false});
    let pq:any=ctx.supabase.from("payments").select("id,amount,payment_method,status,verified_at,created_at,branch_id,order_id").eq("tenant_id",ctx.tenantId).eq("status","verified").is("deleted_at",null).gte("verified_at",start).lt("verified_at",until).order("verified_at",{ascending:false});
    if(branch){oq=oq.eq("branch_id",branch);eq=eq.eq("branch_id",branch);pq=pq.eq("branch_id",branch)}
    const[{data:s,error:se},{data:o,error:oe},{data:e,error:ee},{data:p,error:pe}]=await Promise.all([summaryReq,oq.range(0,1999),eq.range(0,1999),pq.range(0,1999)]);
    if(se||oe||ee||pe)setMessage(se?.message||oe?.message||ee?.message||pe?.message||"");
    setSummary(s||null);setOrders(o??[]);setExpenses(e??[]);setPayments(p??[]);setLoading(false);setPage(1);
  }

  const paymentBreakdown=useMemo(()=>{
    const map:Record<string,number>={cash:0,bank_transfer:0,qris:0,ewallet:0,other:0};payments.forEach((p:any)=>{const k=map[p.payment_method]!==undefined?p.payment_method:"other";map[k]+=Number(p.amount||0)});return map;
  },[payments]);
  const expenseBreakdown=useMemo(()=>{const map:Record<string,number>={};expenses.forEach((e:any)=>{const k=e.expense_categories?.name||"Lain-lain";map[k]=(map[k]||0)+Number(e.amount||0)});return Object.entries(map).sort((a,b)=>b[1]-a[1])},[expenses]);
  const filteredOrders=useMemo(()=>orders.filter((o:any)=>!search.trim()||`${o.order_number} ${o.customer_name} ${o.branches?.name||""}`.toLowerCase().includes(search.trim().toLowerCase())),[orders,search]);
  const totalPages=Math.max(1,Math.ceil(filteredOrders.length/pageSize));
  const visibleOrders=filteredOrders.slice((page-1)*pageSize,page*pageSize);
  const tenant=ctx?.membership?.tenants as any;
  const selectedBranch=branchId==="all"?null:branches.find((b:any)=>b.id===branchId);
  const branchLabel=selectedBranch?.name||"Semua Cabang";
  const profit=Number(summary?.net_profit||0);

  function meta(){const address=selectedBranch?[selectedBranch.address,selectedBranch.city,selectedBranch.province].filter(Boolean).join(", "):"Laporan konsolidasi seluruh cabang";const contact=selectedBranch?[selectedBranch.phone,selectedBranch.email].filter(Boolean).join(" • "):"";return [`Bisnis: ${tenant?.name||"Laundry"}`,`Periode: ${from} s/d ${to}`,`Cabang: ${branchLabel}`,address,contact,`Dibuat: ${new Date().toLocaleString("id-ID")}`].filter(Boolean)}
  function pdf(){
    const cards=`<div class="cards"><div class="card"><span>Penjualan Kotor</span><b>${rupiah(summary?.gross_sales)}</b></div><div class="card"><span>Diskon</span><b>${rupiah(summary?.discounts)}</b></div><div class="card"><span>Penjualan Bersih</span><b>${rupiah(summary?.net_sales)}</b></div><div class="card"><span>Pengeluaran</span><b>${rupiah(summary?.expenses)}</b></div></div><div class="${profit>=0?"profit":"profit loss"}">${profit>=0?"Laba Bersih":"Rugi Bersih"}: ${rupiah(profit)}</div>`;
    const table=`<h3>Detail Order</h3><table><thead><tr><th>Order</th><th>Pelanggan</th><th>Cabang</th><th>Status</th><th>Total</th><th>Dibayar</th></tr></thead><tbody>${orders.map((o:any)=>`<tr><td>${o.order_number}</td><td>${o.customer_name}</td><td>${o.branches?.name||"-"}</td><td>${o.status}</td><td>${rupiah(o.grand_total)}</td><td>${rupiah(o.paid_amount)}</td></tr>`).join("")}</tbody></table>`;
    printReport(`Laporan Keuangan - ${tenant?.name||"Laundry"}`,meta(),tenant?.logo_url||null,cards,table);
  }
  function excel(){
    exportExcelHtml(`Laporan-Keuangan-${from}-${to}.xls`,`Laporan Keuangan - ${tenant?.name||"Laundry"}`,meta(),[
      {label:"No Order",value:(o:any)=>o.order_number},{label:"Tanggal",value:(o:any)=>dateTime(o.created_at)},{label:"Pelanggan",value:(o:any)=>o.customer_name},{label:"Cabang",value:(o:any)=>o.branches?.name||"-"},{label:"Status",value:(o:any)=>o.status},{label:"Grand Total",value:(o:any)=>Number(o.grand_total||0)},{label:"Dibayar",value:(o:any)=>Number(o.paid_amount||0)},{label:"Sisa",value:(o:any)=>Number(o.balance_due||0)}
    ],orders);
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="content-kicker"><BarChart3 size={14}/> FINANCE REPORT</div><h1 className="page-title mt-2">Laporan & Laba Rugi</h1><p className="muted mt-1">Per cabang atau konsolidasi semua cabang, siap print/PDF dan Excel.</p></div><div className="flex flex-wrap gap-2"><button onClick={pdf} className="btn-secondary gap-2" disabled={!summary}><Printer size={16}/> PDF / Print</button><button onClick={excel} className="btn-primary gap-2" disabled={!summary}><FileSpreadsheet size={16}/> Excel</button></div></div>
    {message&&<div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-600">{message}</div>}

    <div className="premium-panel p-4"><div className="grid gap-3 md:grid-cols-[220px_180px_180px_auto]"><select className="input" value={branchId} onChange={e=>setBranchId(e.target.value)}><option value="all">Semua Cabang</option>{branches.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}</select><input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)}/><input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)}/><button onClick={load} className="btn-primary gap-2"><RefreshCw size={16}/> Refresh Laporan</button></div></div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Penjualan Kotor" value={rupiah(summary?.gross_sales)} icon={Banknote} index={1}/><Metric label="Diskon" value={rupiah(summary?.discounts)} icon={TrendingDown} index={2}/><Metric label="Penjualan Bersih" value={rupiah(summary?.net_sales)} icon={TrendingUp} index={3}/><Metric label="Pengeluaran" value={rupiah(summary?.expenses)} icon={WalletCards} index={4}/></div>
    <div className={`theme-card ${profit>=0?"theme-card-4":"theme-card-5"} p-6`}><div className="text-xs font-black uppercase tracking-widest text-slate-500">{profit>=0?"Laba Bersih":"Rugi Bersih"}</div><div className={`mt-2 text-4xl font-black ${profit<0?"text-rose-600":"text-emerald-700"}`}>{loading?"…":rupiah(profit)}</div><div className="mt-2 text-sm text-slate-500">Penjualan bersih − pengeluaran pada periode terpilih.</div></div>

    <div className="grid gap-5 xl:grid-cols-2">
      <div className="premium-panel p-5"><h2 className="section-title">Pembayaran Terkumpul</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Mini label="Cash" value={paymentBreakdown.cash} index={1}/><Mini label="Transfer" value={paymentBreakdown.bank_transfer} index={2}/><Mini label="QRIS" value={paymentBreakdown.qris} index={3}/><Mini label="E-Wallet" value={paymentBreakdown.ewallet} index={4}/><Mini label="Lainnya" value={paymentBreakdown.other} index={5}/><Mini label="Total Collected" value={Number(summary?.collected||0)} index={6}/></div></div>
      <div className="premium-panel p-5"><h2 className="section-title">Pengeluaran per Kategori</h2><div className="mt-4 space-y-2">{expenseBreakdown.map(([name,value],i)=><div key={name} className={`theme-card theme-card-${(i%8)+1} flex justify-between p-3 text-sm`}><span className="font-bold">{name}</span><b>{rupiah(value)}</b></div>)}{!expenseBreakdown.length&&<div className="text-sm text-slate-400">Belum ada pengeluaran di periode ini.</div>}</div></div>
    </div>

    <div className="premium-panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/70 p-4"><div><h2 className="section-title">Detail Order</h2><p className="text-xs text-slate-500">{orders.length} order non-hapus pada periode ini.</p></div><div className="flex gap-2"><input className="input !w-[250px]" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Cari order / pelanggan / cabang"/><select className="input !w-auto" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}}><option value={10}>10 / hal</option><option value={20}>20 / hal</option><option value={50}>50 / hal</option></select></div></div><div className="overflow-x-auto"><table className="min-w-full"><thead><tr><th>Order</th><th>Pelanggan</th><th>Cabang</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Dibayar</th></tr></thead><tbody>{visibleOrders.map((o:any)=><tr key={o.id}><td><b>{o.order_number}</b><div className="text-xs text-slate-400">{dateTime(o.created_at)}</div></td><td>{o.customer_name}</td><td>{o.branches?.name||"-"}</td><td>{o.status}</td><td className="text-right font-bold">{rupiah(o.grand_total)}</td><td className="text-right">{rupiah(o.paid_amount)}</td></tr>)}{!visibleOrders.length&&<tr><td colSpan={6} className="py-10 text-center text-slate-400">Belum ada data order.</td></tr>}</tbody></table></div><div className="flex items-center justify-between border-t border-white/70 p-4 text-sm"><span>Halaman {page} dari {totalPages}</span><div className="flex gap-2"><button className="btn-secondary !px-3 !py-2" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button><button className="btn-secondary !px-3 !py-2" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>›</button></div></div></div>
  </div>;
}

function Metric({label,value,icon:Icon,index}:{label:string;value:string;icon:any;index:number}){return <div className={`theme-card theme-card-${index} p-5`}><div className="brand-gradient mb-4 grid h-10 w-10 place-items-center rounded-2xl text-white"><Icon size={18}/></div><div className="text-xl font-black">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>}
function Mini({label,value,index}:{label:string;value:number;index:number}){return <div className={`theme-card theme-card-${index} p-3`}><div className="text-xs font-bold text-slate-500">{label}</div><div className="mt-1 font-black">{rupiah(value)}</div></div>}
