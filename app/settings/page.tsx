"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Save, Store, Palette, ShieldCheck, RotateCcw, ImageIcon } from "lucide-react";
import { defaultTheme, normalizeTheme, themePresets, type ThemeConfig } from "@/lib/theme";

const presetLabels: Record<string,string> = {
  aurora: "Aurora",
  ocean: "Ocean",
  sunset: "Sunset",
  mint: "Mint",
  rose: "Rose",
  graphite: "Graphite",
};

export default function SettingsPage(){
  const supabase=createClient();
  const[tenantId,setTenantId]=useState("");
  const[role,setRole]=useState("");
  const[form,setForm]=useState<any>({
    name:"",
    slug:"",
    app_name:"LondriOne",
    app_tagline:"The Operating System for Modern Laundry Business.",
    logo_url:"",
    favicon_url:"",
    currency:"IDR",
    timezone:"Asia/Jakarta",
    order_prefix:"LDR",
    theme_config:defaultTheme
  });
  const[msg,setMsg]=useState("");
  const[saving,setSaving]=useState(false);

  async function load(){
    const{data:{session}}=await supabase.auth.getSession();const user=session?.user;if(!user)return;
    const{data:m}=await supabase.from("tenant_memberships").select("tenant_id,role").eq("user_id",user.id).eq("status","active").limit(1).maybeSingle();if(!m)return;
    setTenantId(m.tenant_id);setRole(m.role);
    const{data:t}=await supabase.from("tenants").select("name,slug,app_name,app_tagline,logo_url,favicon_url,currency,timezone,order_prefix,status,theme_config").eq("id",m.tenant_id).single();
    if(t)setForm({...t,theme_config:normalizeTheme(t.theme_config)});
  }

  useEffect(()=>{load()},[]);

  const theme: ThemeConfig = normalizeTheme(form.theme_config);

  function setTheme(patch: Partial<ThemeConfig>){
    setForm((current:any)=>({...current,theme_config:{...normalizeTheme(current.theme_config),...patch}}));
  }

  function applyPreset(name:string){
    const preset=themePresets[name]??defaultTheme;
    setForm((current:any)=>({...current,theme_config:structuredClone(preset)}));
  }

  function updateCard(index:number,key:"from"|"to",value:string){
    const current=normalizeTheme(form.theme_config);
    const cards=current.card_gradients.map((item,i)=>i===index?{...item,[key]:value}:item);
    setTheme({preset:"custom",card_gradients:cards});
  }

  async function save(e:FormEvent){
    e.preventDefault();setMsg("");setSaving(true);
    const{error}=await supabase.from("tenants").update({
      name:form.name,
      app_name:(form.app_name||"LondriOne").trim(),
      app_tagline:(form.app_tagline||"").trim(),
      logo_url:form.logo_url||null,
      favicon_url:form.favicon_url||null,
      currency:form.currency,
      timezone:form.timezone,
      order_prefix:form.order_prefix,
      theme_config:normalizeTheme(form.theme_config),
    }).eq("id",tenantId);
    setSaving(false);
    if(error){setMsg(error.message);return;}
    setMsg("Pengaturan bisnis, branding & tema tersimpan.");
    setTimeout(()=>window.location.reload(),450);
  }

  return <div className="space-y-6">
    <div><h1 className="page-title">Pengaturan Bisnis</h1><p className="muted mt-1">Identitas bisnis, white-label branding, favicon, dan tampilan dashboard dibuat berbeda untuk setiap instalasi.</p></div>

    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="theme-card theme-card-1 p-6">
          <div className="mb-5 flex items-center gap-3"><div className="brand-gradient grid h-11 w-11 place-items-center rounded-2xl text-white"><Store size={20}/></div><div><h2 className="section-title">Profil Bisnis & Branding</h2><p className="muted">Identitas laundry dan identitas aplikasi white-label.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Nama Laundry</label><input className="input" value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div><label className="label">Slug</label><input className="input bg-white/60" value={form.slug||""} disabled/></div>
            <div><label className="label">Nama Aplikasi</label><input className="input" value={form.app_name||""} onChange={e=>setForm({...form,app_name:e.target.value})} placeholder="Contoh: Ceria Laundry OS"/></div>
            <div><label className="label">Tagline Aplikasi</label><input className="input" value={form.app_tagline||""} onChange={e=>setForm({...form,app_tagline:e.target.value})} placeholder="Contoh: Laundry lebih mudah, cepat, dan rapi"/></div>
            <div><label className="label">URL Logo</label><input className="input" value={form.logo_url||""} onChange={e=>setForm({...form,logo_url:e.target.value})} placeholder="https://.../logo.png"/></div>
            <div><label className="label">URL Favicon</label><input className="input" value={form.favicon_url||""} onChange={e=>setForm({...form,favicon_url:e.target.value})} placeholder="https://.../favicon.png"/></div>
            <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/55 p-4"><div className="flex items-center gap-2 text-sm font-bold"><ImageIcon size={16}/> Preview Logo</div><div className="mt-3 flex h-20 items-center justify-center rounded-xl bg-white/70">{form.logo_url?<img src={form.logo_url} alt="Preview logo" className="max-h-16 max-w-full object-contain"/>:<span className="text-xs text-slate-400">Belum ada URL logo</span>}</div></div>
              <div className="rounded-2xl border border-white/80 bg-white/55 p-4"><div className="flex items-center gap-2 text-sm font-bold"><ImageIcon size={16}/> Preview Favicon</div><div className="mt-3 flex h-20 items-center justify-center rounded-xl bg-white/70">{form.favicon_url?<img src={form.favicon_url} alt="Preview favicon" className="h-12 w-12 rounded-lg object-contain"/>:<span className="text-xs text-slate-400">Belum ada URL favicon</span>}</div></div>
            </div>
            <div><label className="label">Prefix Order</label><input className="input" value={form.order_prefix||"LDR"} onChange={e=>setForm({...form,order_prefix:e.target.value.toUpperCase()})}/></div>
            <div><label className="label">Currency</label><input className="input" value={form.currency||"IDR"} onChange={e=>setForm({...form,currency:e.target.value.toUpperCase()})}/></div>
            <div className="sm:col-span-2"><label className="label">Timezone</label><select className="input" value={form.timezone||"Asia/Jakarta"} onChange={e=>setForm({...form,timezone:e.target.value})}><option value="Asia/Jakarta">WIB - Asia/Jakarta</option><option value="Asia/Makassar">WITA - Asia/Makassar</option><option value="Asia/Jayapura">WIT - Asia/Jayapura</option></select></div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="theme-card theme-card-5 p-5"><Palette className="brand-text"/><div className="mt-4 font-black">Dynamic Theme</div><p className="mt-2 text-sm text-slate-500">Dashboard tidak dikunci ke warna LondriOne. Owner bisa pilih preset atau mengatur warna sendiri.</p></div>
          <div className="theme-card theme-card-4 p-5"><ShieldCheck className="text-emerald-600"/><div className="mt-4 font-black">Akses Akun</div><div className="mt-2 text-sm text-slate-500">Role Anda: <b className="capitalize">{role}</b></div><p className="mt-2 text-xs text-slate-400">RLS Supabase tetap membatasi data berdasarkan bisnis dan cabang.</p></div>
        </div>
      </div>

      <div className="theme-card theme-card-2 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="section-title">Tema Dashboard</h2><p className="muted mt-1">Pilih paket warna, lalu kalau perlu edit warna satu per satu.</p></div>
          <button type="button" onClick={()=>applyPreset("aurora")} className="btn-secondary gap-2"><RotateCcw size={15}/> Reset</button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Object.entries(themePresets).map(([name,preset])=><button key={name} type="button" onClick={()=>applyPreset(name)} className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${theme.preset===name?"ring-2 ring-offset-2":""}`} style={{borderColor:preset.primary,boxShadow:theme.preset===name?`0 0 0 2px ${preset.primary}`:undefined}}>
            <div className="h-14 rounded-xl" style={{backgroundImage:`linear-gradient(135deg,${preset.sidebar_from},${preset.sidebar_to})`}}/>
            <div className="mt-2 text-sm font-bold">{presetLabels[name]??name}</div>
          </button>)}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Primary", "primary"], ["Secondary", "secondary"], ["Sidebar Awal", "sidebar_from"],
            ["Sidebar Akhir", "sidebar_to"], ["Glow Background 1", "page_glow_1"], ["Glow Background 2", "page_glow_2"],
          ].map(([label,key])=><label key={key} className="rounded-2xl border border-white/80 bg-white/55 p-3">
            <span className="label">{label}</span>
            <div className="flex items-center gap-3"><input type="color" className="h-10 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0" value={(theme as any)[key]} onChange={e=>setTheme({preset:"custom",[key]:e.target.value} as any)}/><input className="input" value={(theme as any)[key]} onChange={e=>setTheme({preset:"custom",[key]:e.target.value} as any)}/></div>
          </label>)}
        </div>
      </div>

      <div className="theme-card theme-card-3 p-6">
        <div><h2 className="section-title">Warna Card Dashboard</h2><p className="muted mt-1">Delapan kombinasi soft-gradient ini dipakai bergantian supaya dashboard tidak terlihat kotak putih polos.</p></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {theme.card_gradients.map((gradient,index)=><div key={index} className="rounded-2xl border border-white/80 p-4" style={{backgroundImage:`linear-gradient(135deg,${gradient.from},${gradient.to})`}}>
            <div className="mb-3 text-sm font-black">Card {index+1}</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-slate-500">Awal<input type="color" className="mt-1 h-9 w-full cursor-pointer rounded-lg border-0 bg-transparent p-0" value={gradient.from} onChange={e=>updateCard(index,"from",e.target.value)}/></label>
              <label className="text-xs font-semibold text-slate-500">Akhir<input type="color" className="mt-1 h-9 w-full cursor-pointer rounded-lg border-0 bg-transparent p-0" value={gradient.to} onChange={e=>updateCard(index,"to",e.target.value)}/></label>
            </div>
          </div>)}
        </div>
      </div>

      {msg&&<div className="rounded-xl bg-sky-50 p-3 text-sm text-sky-700">{msg}</div>}
      <button disabled={saving} className="btn-primary gap-2"><Save size={16}/> {saving?"Menyimpan...":"Simpan Semua Pengaturan"}</button>
    </form>
  </div>;
}
