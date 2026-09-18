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

/**
 * Public-safe installation status.
 * Uses a tiny SECURITY DEFINER RPC instead of the server secret key,
 * so public pages never crash just because an admin client is unavailable.
 *
 * Returns:
 * - true  = Owner exists
 * - false = fresh installation
 * - null  = RPC unavailable/error (caller must fail safely)
 */
export async function installationHasOwnerPublic(): Promise<boolean | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("installation_has_owner");
    if (error) {
      console.error("[installation_has_owner]", error.code, error.message);
      return null;
    }
    return data === true;
  } catch (error) {
    console.error("[installation_has_owner] unexpected error", error);
    return null;
  }
}

/**
 * Privileged helper for backend-only code. Fail closed instead of throwing.
 */
export async function installationHasOwner(): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("tenant_memberships")
      .select("id", { count: "exact", head: true })
      .eq("role", "owner")
      .eq("status", "active");

    if (error) {
      console.error("[installationHasOwner/admin]", error.code, error.message);
      return true;
    }
    return (count ?? 0) > 0;
  } catch (error) {
    console.error("[installationHasOwner/admin] unexpected error", error);
    return true;
  }
}
