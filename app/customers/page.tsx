"use client";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Mail, MapPin, MessageCircle, Pencil, Plus, Search, StickyNote, UserRound, UserRoundPlus, UserX, Users, X } from "lucide-react";

type Customer={id:string;full_name:string;phone:string|null;email:string|null;address:string|null;notes:string|null;status:string;telegram_chat_id?:string|null;notify_whatsapp?:boolean;notify_email?:boolean;notify_telegram?:boolean};
const empty={full_name:"",phone:"",email:"",address:"",notes:""};

export default function CustomersPage(){
 const supabase=createClient(); const[rows,setRows]=useState<Customer[]>([]); const[tenantId,setTenantId]=useState(""); const[form,setForm]=useState(empty); const[editing,setEditing]=useState<Customer|null>(null); const[search,setSearch]=useState(""); const[msg,setMsg]=useState("");
 async function load(){const{data:{user}}=await supabase.auth.getUser();if(!user)return;const{data:m}=await supabase.from("tenant_memberships").select("tenant_id").eq("user_id",user.id).eq("status","active").limit(1).maybeSingle();if(!m)return;setTenantId(m.tenant_id);let q=supabase.from("customers").select("id,full_name,phone,email,address,notes,status,telegram_chat_id,notify_whatsapp,notify_email,notify_telegram").eq("tenant_id",m.tenant_id).is("deleted_at",null).order("created_at",{ascending:false}).limit(100);if(search.trim())q=q.or(`full_name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);const{data}=await q;setRows((data??[]) as Customer[])}
 useEffect(()=>{load()},[]);
 async function save(e:FormEvent){e.preventDefault();setMsg("");if(editing){const{error}=await supabase.from("customers").update({...form}).eq("id",editing.id);if(error)return setMsg(error.message)}else{const{error}=await supabase.from("customers").insert({tenant_id:tenantId,...form});if(error)return setMsg(error.message)}setForm(empty);setEditing(null);setMsg("Tersimpan.");load()}
 function edit(r:Customer){setEditing(r);setForm({full_name:r.full_name,phone:r.phone||"",email:r.email||"",address:r.address||"",notes:r.notes||""});window.scrollTo({top:0,behavior:"smooth"})}
 async function toggle(r:Customer){await supabase.from("customers").update({status:r.status==="active"?"inactive":"active"}).eq("id",r.id);load()}
 const active=rows.filter(r=>r.status==="active").length;
 return <div className="space-y-6">
   <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="content-kicker"><Users size={14}/> CUSTOMER CRM</div><h1 className="page-title mt-2">Pelanggan</h1><p className="muted mt-1">Data pelanggan rapi, siap dipakai untuk order, notifikasi, dan histori laundry.</p></div><div className="flex gap-3"><div className="theme-card theme-card-4 px-4 py-3"><div className="text-xs font-bold text-slate-500">Aktif</div><div className="text-xl font-black">{active}</div></div><div className="theme-card theme-card-2 px-4 py-3"><div className="text-xs font-bold text-slate-500">Total</div><div className="text-xl font-black">{rows.length}</div></div></div></div>

   <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
    <form onSubmit={save} className="premium-panel h-fit p-5 xl:sticky xl:top-24">
      <div className="premium-form-head flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl text-white shadow"><UserRoundPlus size={19}/></div><div><h2 className="section-title">{editing?"Edit Pelanggan":"Tambah Pelanggan"}</h2><p className="text-xs text-slate-500">Data dasar untuk transaksi dan komunikasi.</p></div></div>{editing&&<button type="button" onClick={()=>{setEditing(null);setForm(empty)}} className="rounded-xl bg-white/70 p-2 text-slate-500 hover:bg-white"><X size={18}/></button>}</div>
      <div className="space-y-3">
       <div><label className="label">Nama Pelanggan</label><input className="input" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Contoh: Budi Santoso" required/></div>
       <div className="grid grid-cols-2 gap-3"><div><label className="label">WhatsApp</label><div className="relative"><MessageCircle className="absolute left-3 top-3 text-slate-400" size={16}/><input className="input pl-9" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="08..."/></div></div><div><label className="label">Email</label><div className="relative"><Mail className="absolute left-3 top-3 text-slate-400" size={16}/><input className="input pl-9" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@..."/></div></div></div>
       <div><label className="label">Alamat</label><div className="relative"><MapPin className="absolute left-3 top-3 text-slate-400" size={16}/><textarea className="input min-h-20 pl-9" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Alamat pelanggan"/></div></div>
       <div><label className="label">Catatan</label><div className="relative"><StickyNote className="absolute left-3 top-3 text-slate-400" size={16}/><textarea className="input min-h-20 pl-9" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Preferensi, catatan khusus, dll."/></div></div>
       {msg&&<div className="rounded-xl bg-sky-50/80 p-3 text-sm text-sky-700 ring-1 ring-sky-100">{msg}</div>}
       <button className="btn-primary w-full gap-2">{editing?<Pencil size={16}/>:<Plus size={16}/>} {editing?"Update Pelanggan":"Simpan Pelanggan"}</button>
      </div>
    </form>

    <section className="premium-panel overflow-hidden">
      <div className="premium-toolbar m-4 p-3"><div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input className="input pl-9" placeholder="Cari nama, WhatsApp, email..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")load()}}/></div><button className="btn-secondary" onClick={load}>Cari</button></div></div>
      <div className="px-4 pb-4">
       <div className="grid gap-3">{rows.map((r,i)=><div key={r.id} className={`theme-card theme-card-${(i%8)+1} flex flex-wrap items-center gap-3 p-4`}><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/60 text-[var(--brand-primary)] shadow-sm"><UserRound size={21}/></div><div className="min-w-0 flex-1"><div className="truncate font-black text-slate-900">{r.full_name}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">{r.phone&&<span className="inline-flex items-center gap-1"><MessageCircle size={12}/>{r.phone}</span>}{r.email&&<span className="inline-flex items-center gap-1"><Mail size={12}/>{r.email}</span>}{!r.phone&&!r.email&&<span>Kontak belum diisi</span>}</div></div><span className={r.status==="active"?"badge-success":"badge-neutral"}>{r.status==="active"?"Aktif":"Nonaktif"}</span><button onClick={()=>edit(r)} className="btn-secondary !px-3 !py-2" title="Edit"><Pencil size={16}/></button><button onClick={()=>toggle(r)} className="rounded-xl bg-rose-50/80 p-2.5 text-rose-600 ring-1 ring-rose-100 hover:bg-rose-100" title="Aktif/nonaktif"><UserX size={16}/></button></div>)}
       {!rows.length&&<div className="premium-empty"><div className="text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/70 text-[var(--brand-primary)] shadow-sm"><Users size={24}/></div><div className="mt-3 font-bold text-slate-600">Belum ada pelanggan</div><div className="mt-1 text-xs">Tambahkan pelanggan pertama dari form di sebelah kiri.</div></div></div>}</div>
      </div>
    </section>
   </div>
 </div>
}
