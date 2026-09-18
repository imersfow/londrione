"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=/onboarding`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName,
          phone,
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
    } else {
      setMessage("Akun dibuat. Cek email konfirmasi, lalu lanjutkan login.");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="glass w-full max-w-md rounded-3xl p-7 sm:p-9">
        <div className="mb-7">
          <div className="text-3xl font-black">Mulai LondriOne</div>
          <p className="muted mt-2">Buat akun owner pertama untuk bisnis laundry Anda.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Nama</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
          </div>

          <div>
            <label className="label">Nomor WhatsApp</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" required autoComplete="tel" />
            <div className="mt-1 text-xs text-slate-400">Dipakai sebagai salah satu pilihan OTP jika gateway WhatsApp tenant aktif.</div>
          </div>

          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>

          <div>
            <label className="label">Password</label>
            <input className="input" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>

          <div>
            <label className="label">Konfirmasi Password</label>
            <input className="input" type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          </div>

          {message && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
          {errorMessage && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{errorMessage}</div>}

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Membuat akun..." : "Daftar"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Sudah punya akun? <Link href="/login" className="font-semibold text-violet-600">Masuk</Link>
        </p>
      </div>
    </main>
  );
}
