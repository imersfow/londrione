"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function PwaRuntime() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const online = () => setOffline(false);
    const offlineHandler = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineHandler);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-xl items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm font-bold text-amber-800 shadow-lg backdrop-blur-xl">
      <WifiOff size={17}/> Koneksi offline. Data operasional tidak akan disimpan sampai internet kembali.
    </div>
  );
}
