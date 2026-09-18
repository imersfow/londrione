import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export type StaffRole = "owner" | "admin" | "manager" | "cashier" | "production" | "courier";

export async function getServerActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  return {
    supabase,
    admin: createAdminClient(),
    user,
    tenantId: membership.tenant_id as string,
    role: membership.role as StaffRole,
  };
}

export async function installationHasOwner() {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("tenant_memberships")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner")
    .eq("status", "active");

  if (error) throw error;
  return (count ?? 0) > 0;
}
