"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Building2, ShieldCheck, UserRound } from "lucide-react";

export function InitialSetupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    business_name: "",
    slug: "",
    branch_name: "Cabang Utama",
    full_name: "",
    phone: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) return setError("Password minimal 8 karakter.");
    if (form.password !== form.confirm_password) return setError("Konfirmasi password tidak sama.");

    setLoading(true);
    const response = await fetch("/api/setup/initial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setLoading(false);
      setError(payload?.error || "Setup awal gagal.");
      return;
    }

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    setLoading(false);
    if (loginError) {
      setError(`Owner sudah dibuat, tetapi login otomatis gagal: ${loginError.message}`);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="glass w-full max-w-3xl rounded-3xl p-6 sm:p-9">
        <div className="mb-7">
          <div className="text-xs font-black uppercase tracking-[.2em] text-violet-600">Initial Setup</div>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Siapkan Bisnis Laundry</h1>
          <p className="muted mt-2 max-w-2xl">Setup ini hanya tersedia sebelum Owner pertama dibuat. Setelah selesai, pendaftaran publik otomatis tidak dipakai lagi.</p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <section className="card-violet p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-sky-500 text-white"><Building2 size={19}/></div>
              <div><div className="font-black">Identitas Bisnis</div><div className="text-xs text-slate-500">Satu instalasi untuk satu bisnis laundry, dengan multi-cabang.</div></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Nama Laundry</label><input className="input" value={form.business_name} onChange={(e)=>set("business_name",e.target.value)} placeholder="Contoh: Laundry Ceria" required/></div>
              <div><label className="label">Slug (opsional)</label><input className="input" value={form.slug} onChange={(e)=>set("slug",e.target.value)} placeholder="laundry-ceria"/></div>
              <div className="sm:col-span-2"><label className="label">Nama Cabang Pertama</label><input className="input" value={form.branch_name} onChange={(e)=>set("branch_name",e.target.value)} required/></div>
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white"><UserRound size={19}/></div>
              <div><div className="font-black">Owner Pertama</div><div className="text-xs text-slate-500">Akun ini memegang akses tertinggi pada instalasi.</div></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Nama Owner</label><input className="input" value={form.full_name} onChange={(e)=>set("full_name",e.target.value)} required/></div>
              <div><label className="label">Nomor WhatsApp</label><input className="input" value={form.phone} onChange={(e)=>set("phone",e.target.value)} placeholder="08xxxxxxxxxx" required/></div>
              <div className="sm:col-span-2"><label className="label">Email Login</label><input className="input" type="email" value={form.email} onChange={(e)=>set("email",e.target.value)} required/></div>
              <div><label className="label">Password</label><input className="input" type="password" minLength={8} value={form.password} onChange={(e)=>set("password",e.target.value)} required/></div>
              <div><label className="label">Konfirmasi Password</label><input className="input" type="password" minLength={8} value={form.confirm_password} onChange={(e)=>set("confirm_password",e.target.value)} required/></div>
            </div>
          </section>

          {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

          <button className="btn-primary w-full gap-2 py-3" disabled={loading}><ShieldCheck size={18}/>{loading ? "Menyiapkan LondriOne..." : "Selesaikan Initial Setup"}</button>
        </form>
      </div>
    </main>
  );
}
