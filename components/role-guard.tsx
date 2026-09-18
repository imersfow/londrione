import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/context";

export async function RoleGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: string[];
}) {
  const { membership } = await getAppContext();
  const role = String(membership.role ?? "");
  if (!roles.includes(role)) redirect("/dashboard");
  return <>{children}</>;
}
