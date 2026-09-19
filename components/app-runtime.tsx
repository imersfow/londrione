"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getBrowserAppContext, type BrowserAppContext } from "@/lib/browser-context";

const accessMap: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/dashboard", roles: ["owner", "admin", "manager", "cashier", "production", "courier"] },
  { prefix: "/orders", roles: ["owner", "admin", "manager", "cashier", "production", "courier"] },
  { prefix: "/online-requests", roles: ["owner", "admin", "manager", "cashier", "courier"] },
  { prefix: "/production", roles: ["owner", "admin", "manager", "production"] },
  { prefix: "/customers", roles: ["owner", "admin", "manager", "cashier"] },
  { prefix: "/services", roles: ["owner", "admin", "manager"] },
  { prefix: "/branches", roles: ["owner", "admin"] },
  { prefix: "/expenses", roles: ["owner", "admin", "manager"] },
  { prefix: "/shifts", roles: ["owner", "admin", "manager", "cashier"] },
  { prefix: "/reports", roles: ["owner", "admin", "manager"] },
  { prefix: "/staff", roles: ["owner", "admin"] },
  { prefix: "/notifications", roles: ["owner", "admin"] },
  { prefix: "/homepage", roles: ["owner", "admin"] },
  { prefix: "/guide", roles: ["owner", "admin", "manager", "cashier", "production", "courier"] },
  { prefix: "/settings", roles: ["owner", "admin"] },
];

function protectedRule(pathname: string) {
  return accessMap.find(({ prefix }) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

function setFavicon(url: string | null | undefined) {
  if (!url) return;
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

export function AppRuntime({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const rule = useMemo(() => protectedRule(pathname), [pathname]);
  const [context, setContext] = useState<BrowserAppContext | null>(null);
  const [booting, setBooting] = useState(Boolean(rule));

  useEffect(() => {
    if (!rule) {
      setBooting(false);
      return;
    }

    let active = true;

    (async () => {
      setBooting(context === null);
      const ctx = context ?? (await getBrowserAppContext());
      if (!active) return;

      if (!ctx) {
        router.replace("/login");
        return;
      }

      if (!ctx.otpVerified && pathname !== "/auth/otp") {
        router.replace("/auth/otp");
        return;
      }

      const role = String(ctx.membership?.role ?? "");
      if (!rule.roles.includes(role)) {
        router.replace("/dashboard");
        return;
      }

      setContext(ctx);
      setBooting(false);
    })();

    return () => {
      active = false;
    };
  }, [rule, pathname, router, context]);

  useEffect(() => {
    if (!context) return;
    const tenant = context.membership?.tenants as any;
    if (tenant?.app_name) document.title = tenant.app_name;
    const icon = tenant?.favicon_url || tenant?.logo_url || null;
    setFavicon(icon);
    if (icon) {
      let apple = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
      if (!apple) {
        apple = document.createElement("link");
        apple.rel = "apple-touch-icon";
        document.head.appendChild(apple);
      }
      apple.href = icon;
    }
    const color = context.theme?.primary || "#7C3AED";
    let meta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [context]);

  if (!rule) return <>{children}</>;

  if (booting || !context) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />
          <div className="mt-3 text-sm font-bold text-slate-700">Menyiapkan dashboard...</div>
        </div>
      </div>
    );
  }

  const tenant = context.membership.tenants as any;

  return (
    <AppShell
      tenantName={tenant?.name ?? "Laundry"}
      appName={tenant?.app_name ?? "LondriOne"}
      appTagline={tenant?.app_tagline ?? "The Operating System for Modern Laundry Business."}
      logoUrl={tenant?.logo_url ?? null}
      role={String(context.membership.role ?? "")}
      theme={context.theme}
    >
      {children}
    </AppShell>
  );
}
