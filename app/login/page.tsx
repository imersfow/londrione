"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { KeyRound } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const message = new URLSearchParams(window.location.search).get("error");
    if (message) setError(message);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const { data: otpState, error: otpError } = await supabase.rpc("get_my_auth_otp_state");
    setLoading(false);

    if (otpError) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    if (otpState?.has_tenant && otpState?.otp_required && !otpState?.otp_verified) {
      router.replace("/auth/otp");
    } else {
      router.replace("/dashboard");
    }

    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="glass w-full max-w-md rounded-3xl p-7 sm:p-9">
        <div className="mb-7">
          <div className="text-3xl font-black">LondriOne</div>
          <p className="muted mt-2">Masuk ke sistem operasional laundry Anda.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label !mb-0">Password</label>
              <Link href="/forgot-password" className="text-xs font-semibold text-violet-600 hover:text-violet-800">Lupa password?</Link>
            </div>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>

          {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Memeriksa akun..." : "Masuk"}
          </button>
        </form>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          <KeyRound size={15} className="mt-0.5 shrink-0 text-violet-600" />
          Jika OTP login diaktifkan admin, setelah password benar Anda dapat memilih WhatsApp, Email, atau Telegram yang tersedia.
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Belum punya akun? <Link href="/register" className="font-semibold text-violet-600">Daftar gratis</Link>
        </p>
      </div>
    </main>
  );
}
