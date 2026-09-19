"use client";

import { useEffect, useState } from "react";
import { Download, CheckCircle2 } from "lucide-react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstallButton({ compact = false }: { compact?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    setInstalled(standalone);
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPrompt);
    };
    const installedHandler = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (installed) {
    return compact ? null : <span className="badge-success gap-1"><CheckCircle2 size={14}/> Sudah terpasang</span>;
  }
  if (!promptEvent) return null;

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setPromptEvent(null);
  }

  return (
    <button onClick={install} className={compact ? "btn-secondary !px-3 !py-2 gap-2" : "btn-primary gap-2"}>
      <Download size={16}/>{compact ? <span className="hidden xl:inline">Install App</span> : "Install Aplikasi"}
    </button>
  );
}
