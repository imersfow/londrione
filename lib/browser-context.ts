"use client";

import { createClient } from "@/lib/supabase-browser";
import { normalizeTheme } from "@/lib/theme";

export type BrowserAppContext = {
  supabase: ReturnType<typeof createClient>;
  user: any;
  membership: any;
  tenantId: string;
  branches: any[];
  otpVerified: boolean;
  theme: ReturnType<typeof normalizeTheme>;
};

let cachedContext: BrowserAppContext | null = null;
let pendingContext: Promise<BrowserAppContext | null> | null = null;

export function clearBrowserAppContext() {
  cachedContext = null;
  pendingContext = null;
}

export async function getBrowserAppContext(force = false): Promise<BrowserAppContext | null> {
  if (!force && cachedContext) return cachedContext;
  if (!force && pendingContext) return pendingContext;

  pendingContext = (async () => {
    const supabase = createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user ?? null;
    if (!user) return null;

    const { data: membership, error: membershipError } = await supabase
      .from("tenant_memberships")
      .select(
        "tenant_id, role, status, tenants(id,name,slug,app_name,app_tagline,logo_url,favicon_url,currency,timezone,theme_config)"
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) return null;

    const tenantId = membership.tenant_id as string;

    const [{ data: branches }, { data: otpVerified, error: otpError }] = await Promise.all([
      supabase
        .from("branches")
        .select("id,name,code,is_main,is_active,address,phone,email,city,province")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("is_main", { ascending: false }),
      supabase.rpc("is_current_session_otp_verified"),
    ]);

    const tenant = membership.tenants as any;

    cachedContext = {
      supabase,
      user,
      membership,
      tenantId,
      branches: branches ?? [],
      otpVerified: otpError ? true : otpVerified !== false,
      theme: normalizeTheme(tenant?.theme_config),
    };

    return cachedContext;
  })();

  try {
    return await pendingContext;
  } finally {
    pendingContext = null;
  }
}
