"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function RegisterPage() {
  const [fullName, setFullName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false); const router = useRouter();
  async function submit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    setLoading(false); if (error) return setMessage(error.message);
    if (data.session) { router.replace("/onboarding"); router.refresh(); }
    else setMessage("Akun dibuat. Cek email konfirmasi Supabase, lalu login.");
  }
  return <main className="grid min-h-screen place-items-center p-5"><div className="glass w-full max-w-md rounded-3xl p-7 sm:p-9">
    <div className="mb-7"><div className="text-3xl font-black">Mulai LondriOne</div><p className="muted mt-2">Buat akun owner pertama.</p></div>
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label">Nama</label><input className="input" value={fullName} onChange={e=>setFullName(e.target.value)} required /></div>
      <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
      <div><label className="label">Password</label><input className="input" type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required /></div>
      {message && <div className="rounded-xl bg-sky-50 p-3 text-sm text-sky-700">{message}</div>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Membuat akun..." : "Daftar"}</button>
    </form>
    <p className="mt-5 text-center text-sm text-slate-500">Sudah punya akun? <Link href="/login" className="font-semibold text-violet-600">Masuk</Link></p>
  </div></main>;
}
