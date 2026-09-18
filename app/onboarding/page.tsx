"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function Onboarding() {
  const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const router = useRouter();
  async function submit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.rpc("create_tenant_with_owner", { p_name: name, p_slug: slug || null });
    setLoading(false); if (error) return setError(error.message);
    router.replace("/dashboard"); router.refresh();
  }
  return <main className="grid min-h-screen place-items-center p-5"><div className="glass w-full max-w-lg rounded-3xl p-8">
    <div className="text-3xl font-black">Setup Laundry</div><p className="muted mt-2">Buat bisnis dan cabang utama. Cabang lain bisa ditambah setelah masuk dashboard.</p>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <div><label className="label">Nama Laundry</label><input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Contoh: Laundry Ceria" required /></div>
      <div><label className="label">Slug (opsional)</label><input className="input" value={slug} onChange={e=>setSlug(e.target.value)} placeholder="laundry-ceria" /></div>
      {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Menyiapkan..." : "Mulai LondriOne"}</button>
    </form>
  </div></main>;
}
