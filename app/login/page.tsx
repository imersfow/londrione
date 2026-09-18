"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.replace("/dashboard"); router.refresh();
  }

  return <main className="grid min-h-screen place-items-center p-5">
    <div className="glass w-full max-w-md rounded-3xl p-7 sm:p-9">
      <div className="mb-7"><div className="text-3xl font-black">LondriOne</div><p className="muted mt-2">Masuk ke sistem operasional laundry Anda.</p></div>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
        <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
        {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Masuk..." : "Masuk"}</button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">Belum punya akun? <Link href="/register" className="font-semibold text-violet-600">Daftar gratis</Link></p>
    </div>
  </main>;
}
