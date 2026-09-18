import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export async function getAppContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, status, tenants(id,name,slug,logo_url,currency,timezone)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  const tenantId = membership.tenant_id as string;
  const { data: branches } = await supabase
    .from("branches")
    .select("id,name,code,is_main,is_active")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("is_main", { ascending: false });

  return { supabase, user, membership, tenantId, branches: branches ?? [] };
}
