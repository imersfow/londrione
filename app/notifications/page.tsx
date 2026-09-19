"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  Bell, CheckCircle2, KeyRound, Mail, MessageCircle, PlayCircle, RefreshCw,
  Save, Send, ShieldCheck, TestTube2, UserRound, XCircle, History, DatabaseZap,
} from "lucide-react";

type ChannelRow = {
  channel:string;
  provider:string;
  is_enabled:boolean;
  credentials_configured:boolean;
  public_config:Record<string,any>|null;
  last_test_status:string|null;
  last_test_message:string|null;
  last_tested_at?:string|null;
  last_test_target?:string|null;
};

type TemplateRow = { id:string; event_key:string; channel:string; subject:string|null; body:string; is_active:boolean };
type TestLog = { id:string; channel:string; provider:string; target:string|null; status:string; message:string|null; created_at:string };
type DeliveryLog = { id:string; event_key:string; channel:string; provider:string; target:string|null; status:string; error_message:string|null; source:string; created_at:string };

const providerOptions:Record<string,string[]> = {
  whatsapp:["fonnte","starsender"],
  email:["mailketing","smtp","gmail"],
  telegram:["telegram"],
};
const icons:Record<string,any> = { whatsapp:MessageCircle, email:Mail, telegram:Send };
const channelLabel:Record<string,string> = { whatsapp:"WhatsApp", email:"Email", telegram:"Telegram" };

function dateTime(value?:string|null){ if(!value) return "-"; return new Date(value).toLocaleString("id-ID"); }

export default function NotificationsPage(){
  const supabase=useMemo(()=>createClient(),[]);
  const[tenantId,setTenantId]=useState("");
  const[rows,setRows]=useState<ChannelRow[]>([]);
  const[selected,setSelected]=useState("whatsapp");
  const[provider,setProvider]=useState("fonnte");
  const[enabled,setEnabled]=useState(false);
  const[config,setConfig]=useState<Record<string,any>>({});
  const[secret,setSecret]=useState("");
  const[msg,setMsg]=useState("");
  const[error,setError]=useState("");
  const[templates,setTemplates]=useState<TemplateRow[]>([]);
  const[testTarget,setTestTarget]=useState("");
  const[testing,setTesting]=useState(false);
  const[processing,setProcessing]=useState(false);
  const[testLogs,setTestLogs]=useState<TestLog[]>([]);
  const[deliveryLogs,setDeliveryLogs]=useState<DeliveryLog[]>([]);
  const[authSettings,setAuthSettings]=useState<any>({require_login_otp:false,allow_whatsapp:true,allow_email:true,allow_telegram:true,otp_expiry_minutes:5,resend_cooldown_seconds:60,max_attempts:5});
  const[profile,setProfile]=useState<any>({email:"",phone:"",telegram_chat_id:"",telegram_username:""});

  function apply(c:ChannelRow){
    setSelected(c.channel);setProvider(c.provider);setEnabled(c.is_enabled);setConfig(c.public_config||{});setSecret("");setMsg("");setError("");
    const preferred=c.channel==="whatsapp"?profile.phone:c.channel==="email"?profile.email:profile.telegram_chat_id;
    setTestTarget(preferred||c.last_test_target||"");
  }

  async function load(){
    setError("");
    const{data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    const{data:m,error:membershipError}=await supabase.from("tenant_memberships").select("tenant_id").eq("user_id",user.id).eq("status","active").limit(1).maybeSingle();
    if(membershipError||!m){setError(membershipError?.message||"Akses bisnis tidak ditemukan.");return;}
    setTenantId(m.tenant_id);
    const profileRes=await fetch("/api/notifications/profile",{cache:"no-store"}).then(r=>r.json()).catch(()=>null);
    const nextProfile={email:profileRes?.email||user.email||"",phone:profileRes?.profile?.phone||"",telegram_chat_id:profileRes?.profile?.telegram_chat_id||"",telegram_username:profileRes?.profile?.telegram_username||""};
    setProfile(nextProfile);
    const[{data:c,error:ce},{data:t,error:te},{data:a},{data:tl},{data:dl}]=await Promise.all([
      supabase.from("notification_channels").select("channel,provider,is_enabled,credentials_configured,public_config,last_test_status,last_test_message,last_tested_at,last_test_target").eq("tenant_id",m.tenant_id).order("channel"),
      supabase.from("notification_templates").select("id,event_key,channel,subject,body,is_active").eq("tenant_id",m.tenant_id).order("event_key").order("channel"),
      supabase.from("tenant_auth_settings").select("require_login_otp,allow_whatsapp,allow_email,allow_telegram,otp_expiry_minutes,resend_cooldown_seconds,max_attempts").eq("tenant_id",m.tenant_id).maybeSingle(),
      supabase.from("notification_test_logs").select("id,channel,provider,target,status,message,created_at").eq("tenant_id",m.tenant_id).order("created_at",{ascending:false}).limit(8),
      supabase.from("notification_delivery_logs").select("id,event_key,channel,provider,target,status,error_message,source,created_at").eq("tenant_id",m.tenant_id).order("created_at",{ascending:false}).limit(12),
    ]);
    if(ce)setError(ce.message); if(te)setError(te.message);
    setRows((c??[]) as ChannelRow[]);setTemplates((t??[]) as TemplateRow[]);if(a)setAuthSettings(a);setTestLogs((tl??[]) as TestLog[]);setDeliveryLogs((dl??[]) as DeliveryLog[]);
    const cur=(c??[]).find((x:any)=>x.channel===selected)||(c??[])[0];
    if(cur){setSelected(cur.channel);setProvider(cur.provider);setEnabled(cur.is_enabled);setConfig(cur.public_config||{});setTestTarget((cur.channel==="whatsapp"?nextProfile.phone:cur.channel==="email"?nextProfile.email:nextProfile.telegram_chat_id)||cur.last_test_target||"");}
  }

  useEffect(()=>{load();/* eslint-disable-next-line react-hooks/exhaustive-deps */},[]);

  async function saveChannel(e:FormEvent){
    e.preventDefault();setMsg("");setError("");
    const{error}=await supabase.rpc("update_notification_channel",{p_tenant_id:tenantId,p_channel:selected,p_enabled:enabled,p_provider:provider,p_public_config:config});
    if(error)return setError(error.message);
    if(secret.trim()){
      const credentials=provider==="smtp"?{password:secret}:provider==="gmail"?{app_password:secret}:provider==="telegram"?{bot_token:secret}:{api_token:secret};
      const{error:se}=await supabase.rpc("save_notification_credentials",{p_tenant_id:tenantId,p_channel:selected,p_credentials:credentials});
      if(se)return setError(se.message);
    }
    setMsg("Pengaturan provider tersimpan.");await load();
  }

  async function runTest(){
    setTesting(true);setMsg("");setError("");
    try{
      const response=await fetch("/api/notifications/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tenant_id:tenantId,channel:selected,target:testTarget})});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.message||"Test provider gagal.");
      setMsg(result.message);await load();
    }catch(e){setError(e instanceof Error?e.message:"Test provider gagal.");}
    finally{setTesting(false);}
  }

  async function processQueue(){
    setProcessing(true);setMsg("");setError("");
    try{
      const response=await fetch("/api/notifications/process",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({limit:20})});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.message||"Worker gagal.");
      setMsg(`Queue diproses: ${result.claimed} job • ${result.sent} terkirim • ${result.failed} gagal.`);await load();
    }catch(e){setError(e instanceof Error?e.message:"Worker gagal.");}
    finally{setProcessing(false);}
  }

  async function saveAuthSettings(){setMsg("");setError("");const{error}=await supabase.from("tenant_auth_settings").update(authSettings).eq("tenant_id",tenantId);if(error)setError(error.message);else setMsg("Pengaturan OTP login tersimpan.");}
  async function saveProfile(){
    setMsg("");setError("");
    const response=await fetch("/api/notifications/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(profile)});
    const result=await response.json();if(!response.ok||!result.success)return setError(result.message||"Gagal menyimpan tujuan OTP.");setMsg(result.message);await load();
  }
  function updateTemplate(row:TemplateRow,field:keyof TemplateRow,value:any){setTemplates(v=>v.map(x=>x.id===row.id?{...x,[field]:value}:x));}
  async function saveTemplates(){setMsg("");setError("");for(const t of templates){const{error}=await supabase.from("notification_templates").update({subject:t.subject||null,body:t.body,is_active:t.is_active}).eq("id",t.id);if(error)return setError(error.message);}setMsg("Template notifikasi tersimpan.");}

  const current=rows.find(r=>r.channel===selected);const Icon=icons[selected]||Bell;
  const connected=!!current?.is_enabled&&!!current?.credentials_configured;
  const templateGroups=useMemo(()=>{const map:Record<string,TemplateRow[]>={};for(const t of templates){(map[t.event_key]??=[]).push(t);}return Object.entries(map);},[templates]);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="content-kicker"><Bell size={14}/> COMMUNICATION CENTER</div><h1 className="page-title mt-2">Notifikasi, Gateway & OTP</h1><p className="muted mt-1">BYOK Fonnte, StarSender, Mailketing, SMTP Hosting, Gmail App Password, dan Telegram Bot.</p></div><button onClick={processQueue} disabled={processing} className="btn-primary gap-2"><DatabaseZap size={17}/>{processing?"Memproses...":"Proses Queue Sekarang"}</button></div>
    {(msg||error)&&<div className={`rounded-2xl p-4 text-sm font-semibold ${error?"bg-rose-50 text-rose-700":"bg-emerald-50 text-emerald-700"}`}>{error||msg}</div>}

    <div className="grid gap-4 md:grid-cols-3">{rows.map(r=>{const I=icons[r.channel]||Bell;return <button key={r.channel} onClick={()=>apply(r)} className={`theme-card p-5 text-left transition ${selected===r.channel?"ring-2 ring-violet-400":"hover:-translate-y-0.5"}`}><div className="flex items-center justify-between"><div className="brand-gradient grid h-11 w-11 place-items-center rounded-2xl text-white"><I size={20}/></div><span className={r.is_enabled?"badge-success":"badge-neutral"}>{r.is_enabled?"Aktif":"OFF"}</span></div><div className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">{channelLabel[r.channel]||r.channel}</div><div className="mt-1 text-xl font-black capitalize">{r.provider}</div><div className="mt-2 text-xs text-slate-500">Credential: {r.credentials_configured?"Tersimpan":"Belum diisi"}</div>{r.last_test_status&&<div className={`mt-2 text-xs font-bold ${r.last_test_status==="success"?"text-emerald-600":"text-rose-600"}`}>Test terakhir: {r.last_test_status} • {dateTime(r.last_tested_at)}</div>}</button>})}</div>

    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <form onSubmit={saveChannel} className="premium-panel p-6"><div className="flex items-center gap-3"><div className="brand-gradient grid h-11 w-11 place-items-center rounded-2xl text-white"><Icon size={20}/></div><div><h2 className="section-title">Setting {channelLabel[selected]}</h2><p className="muted">Secret disimpan di schema private dan tidak ditampilkan kembali.</p></div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><div><label className="label">Provider</label><select className="input" value={provider} onChange={e=>{setProvider(e.target.value);setSecret("");setConfig({});}}>{providerOptions[selected]?.map(p=><option key={p} value={p}>{p}</option>)}</select></div><label className="flex items-center gap-3 rounded-2xl bg-white/55 px-4 py-3 ring-1 ring-white/80"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/><span className="font-bold">Aktifkan channel</span></label>
          {selected==="email"&&provider==="mailketing"&&<><Field label="From Name" value={config.from_name||""} onChange={v=>setConfig({...config,from_name:v})}/><Field label="From Email" type="email" value={config.from_email||""} onChange={v=>setConfig({...config,from_email:v})}/><div className="md:col-span-2"><Field label="API URL" value={config.api_url||"https://api.mailketing.co.id/api/v1/send"} onChange={v=>setConfig({...config,api_url:v})}/></div></>}
          {selected==="email"&&provider==="smtp"&&<><Field label="SMTP Host" value={config.smtp_host||""} onChange={v=>setConfig({...config,smtp_host:v})}/><Field label="Port" type="number" value={String(config.smtp_port||465)} onChange={v=>setConfig({...config,smtp_port:Number(v)})}/><Field label="Username" value={config.smtp_username||""} onChange={v=>setConfig({...config,smtp_username:v})}/><div><label className="label">Security</label><select className="input" value={config.smtp_secure||"ssl"} onChange={e=>setConfig({...config,smtp_secure:e.target.value})}><option value="ssl">SSL</option><option value="tls">TLS / STARTTLS</option><option value="none">None</option></select></div><Field label="From Name" value={config.from_name||""} onChange={v=>setConfig({...config,from_name:v})}/><Field label="From Email" value={config.from_email||""} onChange={v=>setConfig({...config,from_email:v})}/></>}
          {selected==="email"&&provider==="gmail"&&<><Field label="Gmail Address" value={config.gmail_address||config.from_email||""} onChange={v=>setConfig({...config,gmail_address:v,from_email:v})}/><Field label="From Name" value={config.from_name||""} onChange={v=>setConfig({...config,from_name:v})}/></>}
          <div className="md:col-span-2"><label className="label">{provider==="smtp"?"SMTP Password":provider==="gmail"?"Gmail App Password":provider==="telegram"?"Bot Token":"API Token"}</label><input className="input" type="password" autoComplete="new-password" placeholder={current?.credentials_configured?"Kosongkan jika tidak ingin mengganti secret":"Masukkan credential provider"} value={secret} onChange={e=>setSecret(e.target.value)}/></div>
        </div><button className="btn-primary mt-5 gap-2"><Save size={16}/> Simpan Provider</button>
      </form>

      <div className="theme-card theme-card-4 p-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/65 text-violet-700"><TestTube2 size={20}/></div><div><h2 className="section-title">Test Connection</h2><p className="muted">Kirim pesan nyata untuk memastikan konfigurasi bekerja.</p></div></div><div className="mt-5"><label className="label">Target Test</label><input className="input" placeholder={selected==="whatsapp"?"628xxxxxxxxxx":selected==="email"?"nama@email.com":"Telegram Chat ID"} value={testTarget} onChange={e=>setTestTarget(e.target.value)}/></div><div className="mt-3 rounded-2xl bg-white/50 p-3 text-xs text-slate-500">Status saat ini: <b>{connected?"Connected":"Belum siap"}</b>{current?.last_test_message?` • ${current.last_test_message}`:""}</div><button type="button" onClick={runTest} disabled={testing||!testTarget.trim()} className="btn-secondary mt-4 w-full gap-2"><PlayCircle size={16}/>{testing?"Mengirim...":"Kirim Test"}</button></div>
    </div>

    <div className="premium-panel p-6"><div className="flex items-center gap-3"><div className="brand-gradient grid h-11 w-11 place-items-center rounded-2xl text-white"><UserRound size={19}/></div><div><h2 className="section-title">Tujuan OTP Akun Saya</h2><p className="muted">Email berasal dari akun login. WhatsApp dan Telegram dapat dilengkapi di sini.</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-4"><Field label="Email Login" value={profile.email||""} disabled onChange={()=>{}}/><Field label="WhatsApp" value={profile.phone||""} onChange={v=>setProfile({...profile,phone:v})}/><Field label="Telegram Chat ID" value={profile.telegram_chat_id||""} onChange={v=>setProfile({...profile,telegram_chat_id:v})}/><Field label="Telegram Username" value={profile.telegram_username||""} onChange={v=>setProfile({...profile,telegram_username:v})}/></div><button type="button" onClick={saveProfile} className="btn-secondary mt-4 gap-2"><Save size={16}/> Simpan Tujuan OTP</button></div>

    <div className="premium-panel p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="brand-gradient grid h-11 w-11 place-items-center rounded-2xl text-white"><KeyRound size={20}/></div><div><h2 className="section-title">OTP Login Multi-Channel</h2><p className="muted">Setelah password benar, user memilih channel yang tersedia.</p></div></div><label className="flex items-center gap-3 rounded-2xl bg-white/55 px-4 py-3"><input type="checkbox" checked={!!authSettings.require_login_otp} onChange={e=>setAuthSettings({...authSettings,require_login_otp:e.target.checked})}/><span className="font-black">Wajibkan OTP saat login</span></label></div><div className="mt-5 grid gap-3 md:grid-cols-3">{["whatsapp","email","telegram"].map(ch=>{const row=rows.find(r=>r.channel===ch);const ready=!!row?.is_enabled&&!!row?.credentials_configured;const key=`allow_${ch}`;return <label key={ch} className={`rounded-2xl p-4 ring-1 ${ready?"bg-emerald-50/70 ring-emerald-200":"bg-slate-50 ring-slate-200"}`}><div className="flex items-center justify-between"><b>{channelLabel[ch]}</b><span className={ready?"badge-success":"badge-neutral"}>{ready?"Connected":"Belum aktif"}</span></div><div className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!authSettings[key]} onChange={e=>setAuthSettings({...authSettings,[key]:e.target.checked})}/><span>Izinkan OTP</span></div></label>})}</div><div className="mt-4 grid gap-4 sm:grid-cols-3"><NumberField label="OTP berlaku (menit)" value={authSettings.otp_expiry_minutes||5} onChange={v=>setAuthSettings({...authSettings,otp_expiry_minutes:v})}/><NumberField label="Resend cooldown (detik)" value={authSettings.resend_cooldown_seconds||60} onChange={v=>setAuthSettings({...authSettings,resend_cooldown_seconds:v})}/><NumberField label="Maks. percobaan" value={authSettings.max_attempts||5} onChange={v=>setAuthSettings({...authSettings,max_attempts:v})}/></div><button type="button" onClick={saveAuthSettings} className="btn-primary mt-5 gap-2"><ShieldCheck size={16}/> Simpan OTP Login</button></div>

    <div className="premium-panel p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="section-title">Template Notifikasi</h2><p className="muted">Editable untuk order, payment, pickup, completed, dan OTP.</p></div><button type="button" onClick={saveTemplates} className="btn-primary gap-2"><Save size={16}/> Simpan Template</button></div><div className="mt-5 space-y-4">{templateGroups.map(([eventKey,items])=><div key={eventKey} className="theme-card p-4"><div className="mb-3 flex items-center justify-between"><div><div className="font-black">{eventKey.replace(/_/g," ")}</div><div className="text-xs text-slate-500">Placeholder seperti {'{customer_name}'}, {'{order_number}'}, {'{tracking_url}'} tetap bisa dipakai.</div></div></div><div className="grid gap-3 xl:grid-cols-3">{items.map(t=><div key={t.id} className="rounded-2xl bg-white/55 p-3"><div className="mb-2 flex items-center justify-between"><b className="text-sm">{channelLabel[t.channel]||t.channel}</b><input type="checkbox" checked={t.is_active} onChange={e=>updateTemplate(t,"is_active",e.target.checked)}/></div>{t.channel==="email"&&<input className="input mb-2" placeholder="Subject" value={t.subject||""} onChange={e=>updateTemplate(t,"subject",e.target.value)}/>}<textarea className="input min-h-28" value={t.body||""} onChange={e=>updateTemplate(t,"body",e.target.value)}/></div>)}</div></div>)}</div></div>

    <div className="grid gap-5 xl:grid-cols-2"><LogPanel title="Test Provider Terakhir" icon={TestTube2}>{testLogs.map(x=><LogRow key={x.id} ok={x.status==="success"} title={`${channelLabel[x.channel]||x.channel} • ${x.provider}`} detail={`${x.target||"-"} • ${dateTime(x.created_at)}`} message={x.message||undefined}/>)}</LogPanel><LogPanel title="Delivery Log Terakhir" icon={History}>{deliveryLogs.map(x=><LogRow key={x.id} ok={x.status==="sent"} title={`${x.event_key.replace(/_/g," ")} • ${x.channel}/${x.provider}`} detail={`${x.target||"-"} • ${dateTime(x.created_at)}`} message={x.error_message||x.source}/>)}</LogPanel></div>
  </div>;
}

function Field({label,value,onChange,type="text",disabled=false}:{label:string;value:string;onChange:(v:string)=>void;type?:string;disabled?:boolean}){return <div><label className="label">{label}</label><input className="input" type={type} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}/></div>}
function NumberField({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}){return <div><label className="label">{label}</label><input className="input" type="number" value={value} onChange={e=>onChange(Number(e.target.value))}/></div>}
function LogPanel({title,icon:Icon,children}:{title:string;icon:any;children:React.ReactNode}){return <div className="premium-panel p-5"><div className="mb-4 flex items-center gap-2"><Icon size={18} className="text-violet-600"/><h2 className="section-title">{title}</h2></div><div className="space-y-2">{children||<div className="premium-empty">Belum ada log.</div>}</div></div>}
function LogRow({ok,title,detail,message}:{ok:boolean;title:string;detail:string;message?:string}){return <div className="flex items-start gap-3 rounded-2xl bg-white/55 p-3">{ok?<CheckCircle2 size={18} className="mt-0.5 text-emerald-600"/>:<XCircle size={18} className="mt-0.5 text-rose-600"/>}<div className="min-w-0"><div className="font-bold capitalize">{title}</div><div className="text-xs text-slate-500">{detail}</div>{message&&<div className="mt-1 text-xs text-slate-500">{message}</div>}</div></div>}
