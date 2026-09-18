import { DashboardWrapper } from "@/components/dashboard-wrapper";
import { RoleGuard } from "@/components/role-guard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardWrapper><RoleGuard roles={["owner","admin"]}>{children}</RoleGuard></DashboardWrapper>;
}
