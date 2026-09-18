import { AppShell } from "@/components/app-shell";
import { getAppContext } from "@/lib/context";
import { normalizeTheme } from "@/lib/theme";

export async function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const { membership } = await getAppContext();
  const tenant = membership.tenants as unknown as { name?: string; theme_config?: unknown } | null;
  const theme = normalizeTheme(tenant?.theme_config);

  return (
    <AppShell
      tenantName={tenant?.name ?? "Laundry"}
      role={membership.role as string}
      theme={theme}
    >
      {children}
    </AppShell>
  );
}
