"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { getBrowserAppContext } from "@/lib/browser-context";
import { defaultHomepageConfig, normalizeHomepageConfig, type HomepageConfig } from "@/lib/homepage";
import { Code2, Eye, Globe2, Plus, Save, Trash2 } from "lucide-react";

export default function HomepageSettingsPage(){
  const supabase=createClient();
  const[tenantId,setTenantId]=useState("");
  const[enabled,setEnabled]=useState(false);
  const[mode,setMode]=useState<"builder"|"custom_html">("builder");
  const[config,setConfig]=useState<HomepageConfig>(defaultHomepageConfig);
  const[customHtml,setCustomHtml]=useState("");
  const[seo,setSeo]=useState({title:"",description:"",keywords:""});
  const[msg,setMsg]=useState("");
  const[saving,setSaving]=useState(false);

  async function load(){
    const ctx=await getBrowserAppContext(); if(!ctx)return; setTenantId(ctx.tenantId);
    const{data,error}=await supabase.from("tenants").select("homepage_enabled,homepage_mode,homepage_config,homepage_custom_html,homepage_seo_title,homepage_seo_description,homepage_seo_keywords").eq("id",ctx.tenantId).single();
    if(error){setMsg(error.message);return;}
    setEnabled(data.homepage_enabled===true);
    setMode(data.homepage_mode==="custom_html"?"custom_html":"builder");
    setConfig(normalizeHomepageConfig(data.homepage_config));
    setCustomHtml(data.homepage_custom_html||"");
    setSeo({title:data.homepage_seo_title||"",description:data.homepage_seo_description||"",keywords:data.homepage_seo_keywords||""});
  }
  useEffect(()=>{load()},[]);

  function patch(p:Partial<HomepageConfig>){setConfig(c=>({...c,...p}));}
  function updateStat(index:number,key:"value"|"label",value:string){setConfig(c=>({...c,stats:c.stats.map((x,i)=>i===index?{...x,[key]:value}:x)}));}
  function updateTestimonial(index:number,key:string,value:string|number){setConfig(c=>({...c,testimonials:c.testimonials.map((x,i)=>i===index?{...x,[key]:value}:x)}));}

  async function save(e:FormEvent){e.preventDefault();setSaving(true);setMsg("");
    const{error}=await supabase.from("tenants").update({homepage_enabled:enabled,homepage_mode:mode,homepage_config:config,homepage_custom_html:customHtml||null,homepage_seo_title:seo.title||null,homepage_seo_description:seo.description||null,homepage_seo_keywords:seo.keywords||null}).eq("id",tenantId);
    setSaving(false); setMsg(error?error.message:"Homepage tersimpan.");
  }

  const toggle=(label:string,key:keyof HomepageConfig)=><label className="flex items-center justify-between gap-4 rounded-2xl bg-white/55 p-3"><span className="text-sm font-black">{label}</span><input type="checkbox" className="h-5 w-5 accent-violet-600" checked={Boolean(config[key])} onChange={e=>patch({[key]:e.target.checked} as Partial<HomepageConfig>)}/></label>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="content-kicker"><Globe2 size={14}/> PUBLIC WEBSITE</div><h1 className="page-title mt-2">Homepage Laundry</h1><p className="muted mt-1">Aktifkan website publik, gunakan builder bawaan, atau paste HTML sendiri.</p></div>{enabled&&<a href="/" target="_blank" className="btn-secondary gap-2"><Eye size={16}/> Lihat Homepage</a>}</div>
    {msg&&<div className="rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-700">{msg}</div>}
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="premium-panel h-fit p-5 xl:sticky xl:top-24">
          <div className="premium-form-head"><h2 className="section-title">Status Homepage</h2></div>
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-2xl bg-white/60 p-4"><span><b>Homepage Publik</b><span className="mt-1 block text-xs text-slate-500">OFF = domain utama masuk login.</span></span><input type="checkbox" className="h-6 w-6 accent-violet-600" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/></label>
            <div><label className="label">Mode</label><select className="input" value={mode} onChange={e=>setMode(e.target.value as any)}><option value="builder">Builder Bawaan</option><option value="custom_html">Custom HTML</option></select></div>
            <div className="rounded-2xl bg-white/55 p-4 text-xs leading-6 text-slate-500">Harga, estimasi, pickup, delivery, dan daftar cabang di homepage otomatis mengikuti setting operasional cabang.</div>
          </div>
        </div>

        <div className="space-y-5">
          {mode==="builder"?<>
            <div className="theme-card theme-card-1 p-5"><h2 className="section-title">Hero</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className="input sm:col-span-2" placeholder="Badge" value={config.hero_badge} onChange={e=>patch({hero_badge:e.target.value})}/><input className="input sm:col-span-2" placeholder="Judul hero" value={config.hero_title} onChange={e=>patch({hero_title:e.target.value})}/><textarea className="input min-h-24 sm:col-span-2" placeholder="Subjudul" value={config.hero_subtitle} onChange={e=>patch({hero_subtitle:e.target.value})}/><input className="input" placeholder="CTA harga" value={config.hero_cta_label} onChange={e=>patch({hero_cta_label:e.target.value})}/><input className="input" placeholder="CTA WhatsApp" value={config.hero_secondary_label} onChange={e=>patch({hero_secondary_label:e.target.value})}/><input className="input sm:col-span-2" placeholder="URL background hero (opsional)" value={config.hero_background_url} onChange={e=>patch({hero_background_url:e.target.value})}/></div></div>
            <div className="theme-card theme-card-2 p-5"><h2 className="section-title">Section</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{toggle("Tampilkan Cabang","show_branches")}{toggle("Tampilkan Layanan","show_services")}{toggle("Tampilkan Harga","show_prices")}{toggle("Tampilkan About","show_about")}{toggle("Tampilkan Statistik","show_stats")}{toggle("Tampilkan Testimonial","show_testimonials")}{toggle("Tampilkan Kontak","show_contact")}{toggle("Tampilkan Footer","show_footer")}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className="input" value={config.branches_title} onChange={e=>patch({branches_title:e.target.value})} placeholder="Judul cabang"/><input className="input" value={config.services_title} onChange={e=>patch({services_title:e.target.value})} placeholder="Judul layanan"/><input className="input" value={config.prices_title} onChange={e=>patch({prices_title:e.target.value})} placeholder="Judul harga"/><input className="input" value={config.testimonials_title} onChange={e=>patch({testimonials_title:e.target.value})} placeholder="Judul testimonial"/></div></div>
            <div className="theme-card theme-card-3 p-5"><h2 className="section-title">Tentang & Kontak</h2><div className="mt-4 space-y-3"><input className="input" value={config.about_title} onChange={e=>patch({about_title:e.target.value})} placeholder="Judul about"/><textarea className="input min-h-28" value={config.about_body} onChange={e=>patch({about_body:e.target.value})}/><input className="input" value={config.contact_title} onChange={e=>patch({contact_title:e.target.value})}/><textarea className="input min-h-20" value={config.contact_text} onChange={e=>patch({contact_text:e.target.value})}/><input className="input" value={config.footer_text} onChange={e=>patch({footer_text:e.target.value})}/></div></div>
            <div className="theme-card theme-card-4 p-5"><h2 className="section-title">Statistik Homepage</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{config.stats.slice(0,4).map((s,i)=><div key={i} className="rounded-2xl bg-white/55 p-3"><input className="input" value={s.value} onChange={e=>updateStat(i,"value",e.target.value)} placeholder="Value"/><input className="input mt-2" value={s.label} onChange={e=>updateStat(i,"label",e.target.value)} placeholder="Label"/></div>)}</div></div>
            <div className="theme-card theme-card-5 p-5"><div className="flex items-center justify-between"><h2 className="section-title">Testimonial</h2><button type="button" className="btn-secondary gap-2" onClick={()=>patch({testimonials:[...config.testimonials,{name:"Pelanggan",meta:"",text:"",rating:5}]})}><Plus size={15}/> Tambah</button></div><div className="mt-4 space-y-3">{config.testimonials.map((t,i)=><div key={i} className="rounded-2xl bg-white/55 p-4"><div className="grid gap-2 sm:grid-cols-2"><input className="input" value={t.name} onChange={e=>updateTestimonial(i,"name",e.target.value)} placeholder="Nama"/><input className="input" value={t.meta||""} onChange={e=>updateTestimonial(i,"meta",e.target.value)} placeholder="Keterangan"/><textarea className="input min-h-20 sm:col-span-2" value={t.text} onChange={e=>updateTestimonial(i,"text",e.target.value)} placeholder="Testimonial"/></div><button type="button" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-rose-600" onClick={()=>patch({testimonials:config.testimonials.filter((_,x)=>x!==i)})}><Trash2 size={13}/> Hapus</button></div>)}</div></div>
          </>:<div className="theme-card theme-card-6 p-5"><div className="flex items-center gap-3"><Code2 className="brand-text"/><div><h2 className="section-title">Custom HTML Homepage</h2><p className="muted">Paste full HTML. Placeholder tersedia untuk branding dan cabang.</p></div></div><textarea className="input mt-4 min-h-[520px] font-mono text-xs leading-6" value={customHtml} onChange={e=>setCustomHtml(e.target.value)} placeholder={'<!doctype html>\n<html>...\n{{business_name}}\n{{branch_name}}\n{{branch_phone}}\n...</html>'}/><div className="mt-3 rounded-2xl bg-white/55 p-4 text-xs leading-6 text-slate-500">Placeholder: <b>{"{{business_name}}"}</b>, <b>{"{{app_name}}"}</b>, <b>{"{{app_tagline}}"}</b>, <b>{"{{logo_url}}"}</b>, <b>{"{{branch_name}}"}</b>, <b>{"{{branch_phone}}"}</b>, <b>{"{{branch_email}}"}</b>, <b>{"{{branch_address}}"}</b>, <b>{"{{branch_city}}"}</b>, <b>{"{{branch_image_url}}"}</b>, <b>{"{{online_order_url}}"}</b>.</div></div>}

          <div className="theme-card theme-card-7 p-5"><h2 className="section-title">SEO</h2><div className="mt-4 space-y-3"><input className="input" placeholder="SEO Title" value={seo.title} onChange={e=>setSeo({...seo,title:e.target.value})}/><textarea className="input min-h-20" placeholder="SEO Description" value={seo.description} onChange={e=>setSeo({...seo,description:e.target.value})}/><input className="input" placeholder="Keywords, pisahkan koma" value={seo.keywords} onChange={e=>setSeo({...seo,keywords:e.target.value})}/></div></div>
        </div>
      </div>
      <button disabled={saving} className="btn-primary gap-2"><Save size={16}/>{saving?"Menyimpan...":"Simpan Homepage"}</button>
    </form>
  </div>;
}
