import { AppShell } from "@/components/app-shell";
import { getAppContext } from "@/lib/context";
import { normalizeTheme } from "@/lib/theme";

export async function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const { membership } = await getAppContext();
  const tenant = membership.tenants as unknown as {
    name?: string;
    app_name?: string;
    app_tagline?: string;
    logo_url?: string | null;
    favicon_url?: string | null;
    theme_config?: unknown;
  } | null;
  const theme = normalizeTheme(tenant?.theme_config);

  return (
    <AppShell
      tenantName={tenant?.name ?? "Laundry"}
      appName={tenant?.app_name ?? "LondriOne"}
      appTagline={tenant?.app_tagline ?? "The Operating System for Modern Laundry Business."}
      logoUrl={tenant?.logo_url ?? null}
      role={membership.role as string}
      theme={theme}
    >
      {children}
    </AppShell>
  );
}
