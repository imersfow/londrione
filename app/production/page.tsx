"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { statusLabel } from "@/lib/ui";
import { RefreshCw, ArrowRight } from "lucide-react";

const lanes = ["received","washing","drying","ironing","ready","out_for_delivery"];

export default function ProductionPage(){
  const supabase=createClient(); const[rows,setRows]=useState<any[]>([]); const[loading,setLoading]=useState(true);
  async function load(){setLoading(true);const{data:{session}}=await supabase.auth.getSession();const user=session?.user;if(!user)return;const{data:m}=await supabase.from("tenant_memberships").select("tenant_id").eq("user_id",user.id).eq("status","active").limit(1).maybeSingle();if(!m)return;const{data}=await supabase.from("orders").select("id,order_number,customer_name,status,promised_at,created_at,branches(name)").eq("tenant_id",m.tenant_id).in("status",lanes).is("deleted_at",null).order("created_at",{ascending:true}).limit(100);setRows(data??[]);setLoading(false)}
  useEffect(()=>{load()},[]);
  async function move(id:string,status:string){await supabase.rpc("update_order_status",{p_order_id:id,p_status:status});load()}
  const grouped=useMemo(()=>Object.fromEntries(lanes.map(s=>[s,rows.filter(r=>r.status===s)])),[rows]);
  return <div className="space-y-6"><div className="flex items-end justify-between gap-3"><div><h1 className="page-title">Papan Produksi</h1><p className="muted mt-1">Pantau cucian dari diterima sampai siap.</p></div><button onClick={load} className="btn-secondary gap-2"><RefreshCw size={16}/>{loading?"Memuat...":"Refresh"}</button></div>
  <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">{lanes.map((s,idx)=><div key={s} className="card min-h-48 p-3"><div className="mb-3 flex items-center justify-between"><div className="text-sm font-black">{statusLabel[s]}</div><span className="badge-neutral">{grouped[s]?.length||0}</span></div><div className="space-y-2">{(grouped[s]??[]).map((o:any)=><div key={o.id} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm"><Link href={`/orders/${o.id}`} className="font-bold text-violet-700">{o.order_number}</Link><div className="mt-1 text-sm font-semibold">{o.customer_name}</div><div className="text-xs text-slate-500">{o.branches?.name||"-"}</div>{idx<lanes.length-1&&<button onClick={()=>move(o.id,lanes[idx+1])} className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-slate-900 px-2 py-2 text-xs font-semibold text-white">Lanjut <ArrowRight size={13}/></button>}</div>)}{!grouped[s]?.length&&<div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">Kosong</div>}</div></div>)}</div></div>
}
