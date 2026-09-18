"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get("error");
    const note = params.get("notice");
    if (message) setError(message);
    if (note) setNotice(note);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("tenant_id,status")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!membership) {
      setLoading(false);
      router.replace("/no-access");
      router.refresh();
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
          <p className="muted mt-2">Masuk ke sistem operasional laundry.</p>
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

          {notice && <div className="rounded-xl bg-sky-50 p-3 text-sm text-sky-700">{notice}</div>}
          {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Memeriksa akun..." : "Masuk"}
          </button>
        </form>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          <KeyRound size={15} className="mt-0.5 shrink-0 text-violet-600" />
          Jika OTP login diaktifkan Owner/Admin, setelah password benar staff dapat memilih WhatsApp, Email, atau Telegram yang tersedia.
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-violet-100 bg-violet-50/70 p-3 text-xs text-violet-700">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" />
          Akun operasional dibuat oleh Owner/Admin. Tidak tersedia pendaftaran publik setelah initial setup.
        </div>
      </div>
    </main>
  );
}
