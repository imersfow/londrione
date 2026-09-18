import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(req: Request) {
  const admin = createAdminClient();
  const body = await req.json().catch(() => ({}));

  const businessName = String(body.business_name ?? "").trim();
  const branchName = String(body.branch_name ?? "Cabang Utama").trim() || "Cabang Utama";
  const fullName = String(body.full_name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const requestedSlug = String(body.slug ?? "").trim();

  if (!businessName || !fullName || !phone || !email || password.length < 8) {
    return NextResponse.json({ error: "Data setup belum lengkap." }, { status: 400 });
  }

  const { count, error: ownerCountError } = await admin
    .from("tenant_memberships")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner")
    .eq("status", "active");

  if (ownerCountError) return NextResponse.json({ error: ownerCountError.message }, { status: 500 });
  if ((count ?? 0) > 0) return NextResponse.json({ error: "Initial setup sudah dikunci karena Owner sudah tersedia." }, { status: 409 });

  const slugBase = slugify(requestedSlug || businessName) || `laundry-${Date.now()}`;
  let userId = "";
  let tenantId = "";

  try {
    const { data: created, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });

    if (createUserError || !created.user) throw new Error(createUserError?.message || "Gagal membuat akun Owner.");
    userId = created.user.id;

    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({ name: businessName, slug: slugBase, created_by: userId })
      .select("id")
      .single();
    if (tenantError || !tenant) throw new Error(tenantError?.message || "Gagal membuat bisnis.");
    tenantId = tenant.id;

    const { data: branch, error: branchError } = await admin
      .from("branches")
      .insert({ tenant_id: tenantId, name: branchName, code: "MAIN", is_main: true, is_active: true })
      .select("id")
      .single();
    if (branchError || !branch) throw new Error(branchError?.message || "Gagal membuat cabang utama.");

    const { error: membershipError } = await admin.from("tenant_memberships").insert({
      tenant_id: tenantId,
      user_id: userId,
      role: "owner",
      status: "active",
    });
    if (membershipError) throw membershipError;

    const { error: branchMembershipError } = await admin.from("branch_memberships").insert({
      tenant_id: tenantId,
      branch_id: branch.id,
      user_id: userId,
      is_active: true,
    });
    if (branchMembershipError) throw branchMembershipError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (tenantId) await admin.from("tenants").delete().eq("id", tenantId);
    if (userId) await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    return NextResponse.json({ error: error?.message || "Initial setup gagal." }, { status: 500 });
  }
}
