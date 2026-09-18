"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, KeyRound, Pencil, Plus, Search, ShieldCheck, UserRound, UserX, X } from "lucide-react";

type Branch = { id: string; name: string; code: string | null; is_main: boolean; is_active: boolean };
type Staff = { user_id:string; full_name:string; phone:string; email:string; role:string; status:string; branch_ids:string[]; branch_names:string[]; is_me:boolean };
const roles = ["admin","manager","cashier","production","courier"];
const roleLabel: Record<string,string> = { owner:"Owner", admin:"Admin", manager:"Manager", cashier:"Kasir", production:"Produksi", courier:"Kurir" };
const emptyForm = { user_id:"", full_name:"", phone:"", email:"", password:"", role:"cashier", status:"active", branch_ids:[] as string[] };

export default function StaffPage(){
  const [items,setItems]=useState<Staff[]>([]),[branches,setBranches]=useState<Branch[]>([]),[actorRole,setActorRole]=useState(""),[form,setForm]=useState(emptyForm),[editing,setEditing]=useState(false),[loading,setLoading]=useState(false),[msg,setMsg]=useState(""),[error,setError]=useState("");
  const [search,setSearch]=useState(""),[roleFilter,setRoleFilter]=useState(""),[statusFilter,setStatusFilter]=useState(""),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(10),[total,setTotal]=useState(0),[totalPages,setTotalPages]=useState(1);

  const query = useMemo(()=>{const p=new URLSearchParams({page:String(page),page_size:String(pageSize)});if(search.trim())p.set("search",search.trim());if(roleFilter)p.set("role",roleFilter);if(statusFilter)p.set("status",statusFilter);return p.toString()},[page,pageSize,search,roleFilter,statusFilter]);

  async function load(){setLoading(true);setError("");const r=await fetch(`/api/staff?${query}`,{cache:"no-store"});const data=await r.json().catch(()=>({}));setLoading(false);if(!r.ok){setError(data.error||"Gagal memuat staff.");return}setItems(data.items||[]);setBranches(data.branches||[]);setActorRole(data.actor_role||"");setTotal(data.pagination?.total||0);setTotalPages(data.pagination?.total_pages||1);if(data.pagination?.page&&data.pagination.page!==page)setPage(data.pagination.page)}
  useEffect(()=>{const t=setTimeout(load,search?300:0);return()=>clearTimeout(t)},[query]);

  function reset(){setForm(emptyForm);setEditing(false);setMsg("");setError("")}
  function edit(s:Staff){setEditing(true);setForm({user_id:s.user_id,full_name:s.full_name,phone:s.phone,email:s.email,password:"",role:s.role,status:s.status,branch_ids:s.branch_ids});setMsg("");setError("");window.scrollTo({top:0,behavior:"smooth"})}
  function toggleBranch(id:string){setForm(f=>({...f,branch_ids:f.branch_ids.includes(id)?f.branch_ids.filter(x=>x!==id):[...f.branch_ids,id]}))}

  async function save(e:FormEvent){e.preventDefault();setLoading(true);setMsg("");setError("");const r=await fetch("/api/staff",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const data=await r.json().catch(()=>({}));setLoading(false);if(!r.ok){setError(data.error||"Gagal menyimpan staff.");return}setMsg(editing?"Data staff diperbarui.":"Akun staff berhasil dibuat.");setForm(emptyForm);setEditing(false);await load()}
  async function deactivate(s:Staff){if(!confirm(`Nonaktifkan akses ${s.full_name||s.email}? Riwayat transaksi tetap disimpan.`))return;setLoading(true);setError("");const r=await fetch("/api/staff",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:s.user_id})});const data=await r.json().catch(()=>({}));setLoading(false);if(!r.ok){setError(data.error||"Gagal menonaktifkan staff.");return}setMsg("Akses staff dinonaktifkan tanpa menghapus histori.");load()}

  return <div className="space-y-6">
    <div><h1 className="page-title">Staff & Akses</h1><p className="muted mt-1">Owner membuat akun internal, menetapkan role, dan menentukan cabang yang boleh diakses.</p></div>

    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <form onSubmit={save} className="card h-fit p-5 xl:sticky xl:top-24">
        <div className="flex items-start justify-between gap-3"><div><h2 className="section-title">{editing?"Edit Staff":"Tambah Staff"}</h2><p className="muted mt-1">Tidak ada register publik untuk akun operasional.</p></div>{editing&&<button type="button" onClick={reset} className="rounded-lg p-2 hover:bg-slate-100"><X size={18}/></button>}</div>
        <div className="mt-5 space-y-3">
          <div><label className="label">Nama Lengkap</label><input className="input" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} required/></div>
          <div><label className="label">WhatsApp</label><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="08xxxxxxxxxx"/></div>
          <div><label className="label">Email Login</label><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/></div>
          <div><label className="label">{editing?"Password Baru (opsional)":"Password Awal"}</label><input className="input" type="password" minLength={editing?0:8} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required={!editing}/><div className="mt-1 text-xs text-slate-400">Minimal 8 karakter. Staff dapat mengganti password lewat flow lupa password.</div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Role</label><select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{roles.filter(r=>actorRole==="owner"||r!=="admin").map(r=><option key={r} value={r}>{roleLabel[r]}</option>)}</select></div>{editing&&<div><label className="label">Status</label><select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></div>}</div>
          <div><label className="label">Akses Cabang</label><div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">{branches.filter(b=>b.is_active).map(b=><label key={b.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5"><input type="checkbox" checked={form.branch_ids.includes(b.id)} onChange={()=>toggleBranch(b.id)}/><span className="text-sm font-semibold">{b.name}</span>{b.is_main&&<span className="badge-info ml-auto">Utama</span>}</label>)}</div><div className="mt-1 text-xs text-slate-400">Jika tidak dipilih, sistem memberi akses ke semua cabang aktif saat akun disimpan.</div></div>
          {msg&&<div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}{error&&<div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          <button disabled={loading} className="btn-primary w-full gap-2">{editing?<Pencil size={16}/>:<Plus size={16}/>} {loading?"Memproses...":editing?"Simpan Perubahan":"Buat Akun Staff"}</button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="card p-4"><div className="grid gap-3 md:grid-cols-[1fr_160px_150px_110px]"><div className="relative"><Search size={17} className="absolute left-3 top-3 text-slate-400"/><input className="input pl-9" placeholder="Cari nama, email, WA, cabang..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></div><select className="input" value={roleFilter} onChange={e=>{setRoleFilter(e.target.value);setPage(1)}}><option value="">Semua role</option><option value="owner">Owner</option>{roles.map(r=><option key={r} value={r}>{roleLabel[r]}</option>)}</select><select className="input" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1)}}><option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select><select className="input" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}}><option value={10}>10 / hal</option><option value={20}>20 / hal</option><option value={50}>50 / hal</option></select></div></div>

        <div className="grid gap-3">{items.map(s=><div key={s.user_id} className={`card p-5 ${s.status!=="active"?"opacity-60":""}`}><div className="flex flex-wrap items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-sky-100 text-violet-700"><UserRound size={21}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><div className="truncate text-lg font-black">{s.full_name||s.email}</div><span className={s.role==="owner"?"badge-info":"badge-neutral"}>{roleLabel[s.role]||s.role}</span><span className={s.status==="active"?"badge-success":"badge-danger"}>{s.status==="active"?"Aktif":"Nonaktif"}</span>{s.is_me&&<span className="badge-warning">Akun Saya</span>}</div><div className="mt-1 text-sm text-slate-500">{s.email}{s.phone?` • ${s.phone}`:""}</div><div className="mt-3 flex flex-wrap gap-2">{s.branch_names.length?s.branch_names.map(b=><span key={b} className="badge-neutral">{b}</span>):<span className="text-xs text-slate-400">Belum ada akses cabang</span>}</div></div>{s.role==="owner"?<div className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700"><ShieldCheck size={15}/> Owner utama</div>:<div className="flex gap-2"><button onClick={()=>edit(s)} className="btn-secondary gap-1 px-3 py-2 text-sm"><Pencil size={14}/> Edit</button><button onClick={()=>deactivate(s)} className="btn-danger gap-1 px-3 py-2 text-sm"><UserX size={14}/> Hapus Akses</button></div>}</div></div>)}{!loading&&!items.length&&<div className="card p-10 text-center text-sm text-slate-500">Tidak ada staff sesuai filter.</div>}{loading&&<div className="card p-10 text-center text-sm text-slate-500">Memuat staff...</div>}</div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"><div className="text-sm text-slate-500">Total <b className="text-slate-900">{total}</b> akun • Halaman {page} dari {totalPages}</div><div className="flex gap-2"><button disabled={page<=1||loading} onClick={()=>setPage(p=>Math.max(1,p-1))} className="btn-secondary px-3 py-2"><ChevronLeft size={16}/></button><button disabled={page>=totalPages||loading} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="btn-secondary px-3 py-2"><ChevronRight size={16}/></button></div></div>
      </div>
    </div>

    <div className="card-violet p-5"><div className="flex items-start gap-3"><KeyRound className="mt-0.5 text-violet-600" size={20}/><div><div className="font-black">Akun Internal, bukan akun pelanggan</div><p className="mt-1 text-sm text-slate-500">Owner/Admin membuat akun operasional dari halaman ini. Pelanggan tidak memperoleh akses dashboard internal. Portal/tracking pelanggan dibangun terpisah.</p></div></div></div>
  </div>
}
