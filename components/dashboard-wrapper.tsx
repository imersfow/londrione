import { AppShell } from "@/components/app-shell";
import { getAppContext } from "@/lib/context";

export async function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const { membership } = await getAppContext();
  const tenant = membership.tenants as unknown as { name?: string } | null;
  return <AppShell tenantName={tenant?.name ?? "Laundry"} role={membership.role as string}>{children}</AppShell>;
}
