"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Kalau email terdaftar, link reset password sudah dikirim. Cek inbox dan folder spam.");
  }

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="glass w-full max-w-md rounded-3xl p-7 sm:p-9">
        <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-700">
          <ArrowLeft size={16} /> Kembali ke login
        </Link>

        <div className="mb-7">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-sky-500 text-white shadow-lg">
            <Mail size={22} />
          </div>
          <h1 className="mt-4 text-3xl font-black">Lupa Password?</h1>
          <p className="muted mt-2">Masukkan email akun LondriOne. Link reset akan dikirim melalui email autentikasi.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>

          {message && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
          {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Mengirim..." : "Kirim Link Reset"}
          </button>
        </form>

        <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
          Untuk keamanan, halaman ini tidak memberi tahu apakah sebuah email terdaftar atau tidak.
        </div>
      </div>
    </main>
  );
}
