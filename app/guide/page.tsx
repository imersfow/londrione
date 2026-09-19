"use client";

import { BookOpenCheck, Building2, Calculator, CheckCircle2, ClipboardList, PackageCheck, Smartphone, Truck, Users, WifiOff } from "lucide-react";
import { PwaInstallButton } from "@/components/pwa-install-button";

const roleGuides = [
  { title:"Owner / Admin", icon:Building2, steps:["Lengkapi Pengaturan Bisnis, branding, favicon dan tema.","Atur cabang, layanan, harga cabang, pickup/delivery dan payment publik.","Buat akun staff dari Staff & Akses dan batasi cabang sesuai kebutuhan.","Pantau laporan, laba rugi, shift, notifikasi dan homepage."] },
  { title:"Manager", icon:Users, steps:["Pantau dashboard cabang yang diberi akses.","Kelola pelanggan, layanan operasional, expense dan laporan.","Awasi produksi dan status order.","Tidak mengubah setting owner/white-label kecuali diberi role Admin."] },
  { title:"Kasir", icon:Calculator, steps:["Buka Shift Kasir dan isi kas awal.","Buat Order Baru untuk pelanggan walk-in atau konversi Order Online.","Catat pembayaran sesuai metode yang diterima.","Tutup shift dan isi kas aktual untuk menghitung selisih."] },
  { title:"Produksi", icon:PackageCheck, steps:["Buka Papan Produksi.","Pindahkan order sesuai proses: diterima, cuci, kering, setrika, siap.","Pastikan status sesuai kondisi fisik cucian.","Status siap dapat memicu notifikasi pelanggan jika channel aktif."] },
  { title:"Kurir", icon:Truck, steps:["Buka Order Online/Pickup yang menjadi tanggung jawab cabang.","Update status penjemputan atau pengantaran.","Gunakan alamat dan catatan pelanggan dari request.","Konfirmasi cucian tiba agar kasir dapat membuat order final."] },
];

const faq = [
  ["Berapa cabang yang disarankan?", "Secara aplikasi tidak di-hard-limit. Untuk instalasi standar/free-tier, rekomendasi operasional awal sekitar 20 cabang per instalasi. Jika trafik dan transaksi besar, upgrade resource Supabase/Vercel atau pisahkan instalasi sesuai kebutuhan."],
  ["Kalau cuma satu cabang?", "Tidak masalah. Homepage otomatis tampil seperti laundry single outlet dan tidak menonjolkan jumlah cabang."],
  ["Order kiloan bisa dibayar online sebelum ditimbang?", "Bisa memakai DP bila owner mengaktifkannya, tetapi harga final kiloan tetap dikonfirmasi setelah cucian ditimbang. Layanan fixed price/paket dapat dibayar penuh lebih awal."],
  ["Apakah customer harus punya akun?", "Tidak. Order online dan tracking customer memakai link publik bertoken. Dashboard internal hanya untuk Owner dan Staff."],
  ["Apakah notifikasi wajib?", "Tidak. WhatsApp, Email dan Telegram bersifat BYOK dan dapat ON/OFF. Operasional tetap dapat berjalan tanpa gateway."],
  ["Apakah aplikasi bisa di-install di HP?", "Ya. LondriOne mendukung PWA. Android/Chrome dapat memakai tombol Install Aplikasi bila tersedia. iPhone/iPad memakai Safari → Share → Add to Home Screen."],
  ["Bisa pakai source code dengan brand sendiri?", "Ya. Nama aplikasi, tagline, logo, favicon, tema, homepage, report header dan PWA mengikuti konfigurasi white-label bisnis."],
];

export default function GuidePage(){
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><span className="content-kicker"><BookOpenCheck size={14}/> PANDUAN OPERASIONAL</span><h1 className="page-title mt-3">Panduan LondriOne</h1><p className="muted mt-1">SOP singkat untuk Owner, Staff dan penggunaan aplikasi di HP.</p></div>
      <PwaInstallButton />
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {roleGuides.map(({title,icon:Icon,steps},index)=><section key={title} className={`theme-card theme-card-${(index%8)+1} p-5`}>
        <div className="flex items-center gap-3"><div className="brand-gradient grid h-11 w-11 place-items-center rounded-2xl text-white"><Icon size={20}/></div><h2 className="section-title">{title}</h2></div>
        <ol className="mt-4 space-y-3 text-sm text-slate-600">{steps.map((step,i)=><li key={step} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/70 text-xs font-black brand-text">{i+1}</span><span className="leading-6">{step}</span></li>)}</ol>
      </section>)}
    </div>

    <section className="premium-panel p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div><div className="flex items-center gap-3"><div className="brand-gradient grid h-11 w-11 place-items-center rounded-2xl text-white"><Smartphone size={20}/></div><div><h2 className="section-title">Install sebagai PWA</h2><p className="muted">Akses cepat seperti aplikasi tanpa Play Store/App Store.</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/60 p-4"><b>Android / Chrome</b><p className="mt-2 text-sm leading-6 text-slate-500">Buka LondriOne di Chrome. Gunakan tombol Install Aplikasi bila muncul, atau menu browser → Install app/Add to Home screen.</p></div><div className="rounded-2xl bg-white/60 p-4"><b>iPhone / iPad</b><p className="mt-2 text-sm leading-6 text-slate-500">Buka lewat Safari → tombol Share → Add to Home Screen. Icon mengikuti logo/favicon white-label yang dikonfigurasi.</p></div></div>
        </div>
        <div className="theme-card theme-card-3 p-5"><WifiOff size={20} className="text-amber-600"/><div className="mt-3 font-black">Mode Offline Aman</div><p className="mt-2 text-sm leading-6 text-slate-500">Halaman operasional sensitif tidak dicache untuk bekerja penuh saat offline. Jika internet putus, aplikasi menampilkan status offline dan meminta koneksi kembali supaya data transaksi tidak menjadi tidak sinkron.</p></div>
      </div>
    </section>

    <section className="theme-card theme-card-6 p-5 sm:p-6">
      <div className="flex items-center gap-3"><ClipboardList className="brand-text"/><div><h2 className="section-title">FAQ</h2><p className="muted">Jawaban singkat untuk pertanyaan yang paling sering muncul saat instalasi dan operasional.</p></div></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">{faq.map(([q,a])=><details key={q} className="rounded-2xl border border-white/80 bg-white/55 p-4 open:bg-white/75"><summary className="cursor-pointer font-bold text-slate-800">{q}</summary><p className="mt-3 text-sm leading-6 text-slate-500">{a}</p></details>)}</div>
    </section>

    <section className="theme-card theme-card-4 p-5 sm:p-6"><div className="flex items-center gap-3"><CheckCircle2 className="text-emerald-600"/><div><h2 className="section-title">Urutan SOP Harian</h2><p className="muted">Buka Shift → terima/konversi order → produksi → pembayaran → closing shift → cek laporan.</p></div></div></section>
  </div>;
}
