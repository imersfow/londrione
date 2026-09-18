"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Mail, MessageCircle, Send, ShieldCheck } from "lucide-react";

type OtpChannel = {
  channel: "whatsapp" | "email" | "telegram";
  label: string;
  masked_target: string;
};

type OtpState = {
  has_tenant?: boolean;
  otp_required?: boolean;
  otp_verified?: boolean;
  expire_minutes?: number;
  resend_cooldown_seconds?: number;
  channels?: OtpChannel[];
};

const channelIcon = {
  whatsapp: MessageCircle,
  email: Mail,
  telegram: Send,
};

export default function OtpPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<OtpState | null>(null);
  const [selected, setSelected] = useState<OtpChannel | null>(null);
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase.rpc("get_my_auth_otp_state");
      if (!alive) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const nextState = (data ?? {}) as OtpState;
      setState(nextState);
      setLoading(false);

      if (!nextState.has_tenant) {
        router.replace("/onboarding");
        return;
      }

      if (!nextState.otp_required || nextState.otp_verified) {
        router.replace("/dashboard");
        router.refresh();
      }
    }

    load();
    return () => { alive = false; };
  }, [router, supabase]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((v) => Math.max(v - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function requestOtp(channel: OtpChannel) {
    setSelected(channel);
    setError("");
    setMessage("");
    setCode("");
    setSending(true);

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: channel.channel }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal mengirim OTP.");
      }

      setChallengeId(result.challenge_id);
      setCooldown(Number(result.resend_cooldown_seconds ?? state?.resend_cooldown_seconds ?? 60));
      setMessage(`Kode OTP dikirim ke ${result.masked_target || channel.masked_target}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim OTP.");
    } finally {
      setSending(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!challengeId) {
      setError("Pilih metode OTP dan kirim kode terlebih dahulu.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Kode OTP harus 6 digit.");
      return;
    }

    setVerifying(true);
    const { data, error } = await supabase.rpc("verify_auth_otp_challenge", {
      p_challenge_id: challengeId,
      p_code: code,
    });
    setVerifying(false);

    if (error || data !== true) {
      setError(error?.message || "Kode OTP tidak valid.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center p-5"><div className="muted">Menyiapkan verifikasi...</div></main>;
  }

  const channels = state?.channels ?? [];

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="glass w-full max-w-lg rounded-3xl p-7 sm:p-9">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-sky-500 text-white shadow-lg">
            <ShieldCheck size={23} />
          </div>
          <div>
            <h1 className="text-3xl font-black">Verifikasi Login</h1>
            <p className="muted mt-2">Pilih ke mana kode OTP ingin dikirim. Pilihan hanya muncul jika channel terhubung dan akun Anda memiliki tujuan yang sesuai.</p>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {channels.map((channel) => {
            const Icon = channelIcon[channel.channel];
            const active = selected?.channel === channel.channel;

            return (
              <button
                key={channel.channel}
                type="button"
                onClick={() => requestOtp(channel)}
                disabled={sending || (cooldown > 0 && active)}
                className={`rounded-2xl border p-4 text-left transition ${active ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow"}`}
              >
                <Icon size={20} className="text-violet-600" />
                <div className="mt-3 font-black">{channel.label}</div>
                <div className="mt-1 break-all text-xs text-slate-500">{channel.masked_target}</div>
              </button>
            );
          })}
        </div>

        {channels.length === 0 && (
          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            Belum ada channel OTP yang tersedia untuk akun ini. Hubungi owner/admin untuk menghubungkan gateway atau melengkapi data akun.
          </div>
        )}

        {selected && (
          <form onSubmit={verify} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5">
            <div>
              <label className="label">Kode OTP 6 Digit</label>
              <input
                className="input text-center text-2xl font-black tracking-[.35em]"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                autoFocus
              />
            </div>

            {message && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
            {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}

            <button className="btn-primary w-full" disabled={verifying || code.length !== 6}>
              {verifying ? "Memverifikasi..." : "Verifikasi & Masuk"}
            </button>

            <button
              type="button"
              className="w-full text-center text-sm font-semibold text-violet-600 disabled:text-slate-400"
              disabled={sending || cooldown > 0}
              onClick={() => selected && requestOtp(selected)}
            >
              {cooldown > 0 ? `Kirim ulang dalam ${cooldown} detik` : "Kirim ulang OTP"}
            </button>
          </form>
        )}

        {!selected && error && <div className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}
      </div>
    </main>
  );
}
