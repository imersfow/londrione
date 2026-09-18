"use client";

import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";

export default function NoAccessPage() {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <main className="grid min-h-screen place-items-center p-5"><div className="glass w-full max-w-md rounded-3xl p-8 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-600"><ShieldX/></div><h1 className="mt-5 text-2xl font-black">Akun Tidak Memiliki Akses</h1><p className="muted mt-2">Akun ini belum didaftarkan sebagai staff pada instalasi laundry ini. Hubungi Owner atau Admin.</p><button onClick={logout} className="btn-primary mt-6 w-full">Kembali ke Login</button></div></main>;
}
