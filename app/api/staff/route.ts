import { NextResponse } from "next/server";
import { getServerActor, type StaffRole } from "@/lib/server-auth";

export const runtime = "nodejs";

const STAFF_ROLES: StaffRole[] = ["admin", "manager", "cashier", "production", "courier"];
const MANAGE_ROLES: StaffRole[] = ["owner", "admin"];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function requireManager() {
  const actor = await getServerActor();
  if (!actor) return { response: jsonError("Belum login.", 401) } as const;
  if (!MANAGE_ROLES.includes(actor.role)) return { response: jsonError("Akses staff hanya untuk Owner/Admin.", 403) } as const;
  return { actor } as const;
}

async function validateBranchIds(admin: any, tenantId: string, branchIds: string[]) {
  if (!branchIds.length) return [] as string[];
  const { data, error } = await admin
    .from("branches")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .in("id", branchIds);
  if (error) throw error;
  const valid = (data ?? []).map((row: any) => String(row.id));
  if (valid.length !== new Set(branchIds).size) throw new Error("Ada cabang yang tidak valid atau sudah nonaktif.");
  return valid;
}

export async function GET(req: Request) {
  const access = await requireManager();
  if ("response" in access) return access.response;
  const { actor } = access;
  const { admin, tenantId } = actor;

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const roleFilter = (url.searchParams.get("role") ?? "").trim();
  const statusFilter = (url.searchParams.get("status") ?? "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(50, Math.max(10, Number(url.searchParams.get("page_size") ?? 10) || 10));

  const [{ data: memberships, error: membershipError }, { data: branches, error: branchError }] = await Promise.all([
    admin.from("tenant_memberships").select("user_id,role,status,created_at,updated_at").eq("tenant_id", tenantId).order("created_at"),
    admin.from("branches").select("id,name,code,is_main,is_active").eq("tenant_id", tenantId).order("is_main", { ascending: false }).order("name"),
  ]);

  if (membershipError) return jsonError(membershipError.message, 500);
  if (branchError) return jsonError(branchError.message, 500);

  const userIds = (memberships ?? []).map((m: any) => String(m.user_id));
  let profiles: any[] = [];
  let branchMemberships: any[] = [];

  if (userIds.length) {
    const [profileResult, branchMembershipResult] = await Promise.all([
      admin.from("profiles").select("id,full_name,phone,avatar_url").in("id", userIds),
      admin.from("branch_memberships").select("user_id,branch_id,is_active").eq("tenant_id", tenantId).in("user_id", userIds),
    ]);
    if (profileResult.error) return jsonError(profileResult.error.message, 500);
    if (branchMembershipResult.error) return jsonError(branchMembershipResult.error.message, 500);
    profiles = profileResult.data ?? [];
    branchMemberships = branchMembershipResult.data ?? [];
  }

  const authResult = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authResult.error) return jsonError(authResult.error.message, 500);

  const profileMap = new Map(profiles.map((p: any) => [String(p.id), p]));
  const emailMap = new Map(authResult.data.users.map((u: any) => [String(u.id), String(u.email ?? "")]));
  const branchNameMap = new Map((branches ?? []).map((b: any) => [String(b.id), String(b.name)]));

  let items = (memberships ?? []).map((m: any) => {
    const userId = String(m.user_id);
    const profile = profileMap.get(userId) ?? {};
    const accessRows = branchMemberships.filter((bm: any) => String(bm.user_id) === userId && bm.is_active);
    const branchIds = accessRows.map((bm: any) => String(bm.branch_id));
    return {
      user_id: userId,
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      avatar_url: profile.avatar_url ?? null,
      email: emailMap.get(userId) ?? "",
      role: String(m.role),
      status: String(m.status),
      branch_ids: branchIds,
      branch_names: branchIds.map((id) => branchNameMap.get(id)).filter(Boolean),
      created_at: m.created_at,
      updated_at: m.updated_at,
      is_me: userId === actor.user.id,
    };
  });

  if (search) {
    items = items.filter((item: any) => [item.full_name, item.email, item.phone, item.role, ...item.branch_names].join(" ").toLowerCase().includes(search));
  }
  if (roleFilter) items = items.filter((item: any) => item.role === roleFilter);
  if (statusFilter) items = items.filter((item: any) => item.status === statusFilter);

  items.sort((a: any, b: any) => {
    if (a.role === "owner" && b.role !== "owner") return -1;
    if (b.role === "owner" && a.role !== "owner") return 1;
    return String(a.full_name || a.email).localeCompare(String(b.full_name || b.email));
  });

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return NextResponse.json({
    items: items.slice(start, start + pageSize),
    branches: branches ?? [],
    pagination: { page: safePage, page_size: pageSize, total, total_pages: totalPages },
    actor_role: actor.role,
  });
}

export async function POST(req: Request) {
  const access = await requireManager();
  if ("response" in access) return access.response;
  const { actor } = access;
  const { admin, tenantId } = actor;
  const body = await req.json().catch(() => ({}));

  const fullName = String(body.full_name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = String(body.role ?? "cashier") as StaffRole;
  const requestedBranchIds = Array.isArray(body.branch_ids) ? body.branch_ids.map(String) : [];

  if (!fullName || !email || password.length < 8) return jsonError("Nama, email, dan password minimal 8 karakter wajib diisi.");
  if (!STAFF_ROLES.includes(role)) return jsonError("Role staff tidak valid.");
  if (actor.role === "admin" && role === "admin") return jsonError("Hanya Owner yang dapat membuat Admin.", 403);

  let branchIds: string[] = [];
  try {
    branchIds = await validateBranchIds(admin, tenantId, requestedBranchIds);
    if (!branchIds.length) {
      const { data: activeBranches, error } = await admin.from("branches").select("id").eq("tenant_id", tenantId).eq("is_active", true);
      if (error) throw error;
      branchIds = (activeBranches ?? []).map((b: any) => String(b.id));
    }
  } catch (error: any) {
    return jsonError(error?.message || "Cabang tidak valid.");
  }

  let userId = "";
  try {
    const { data: created, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });
    if (createUserError || !created.user) throw new Error(createUserError?.message || "Gagal membuat akun staff.");
    userId = created.user.id;

    const { error: membershipError } = await admin.from("tenant_memberships").insert({
      tenant_id: tenantId,
      user_id: userId,
      role,
      status: "active",
    });
    if (membershipError) throw membershipError;

    if (branchIds.length) {
      const { error: branchMembershipError } = await admin.from("branch_memberships").insert(branchIds.map((branchId) => ({
        tenant_id: tenantId,
        branch_id: branchId,
        user_id: userId,
        is_active: true,
      })));
      if (branchMembershipError) throw branchMembershipError;
    }

    return NextResponse.json({ success: true, user_id: userId });
  } catch (error: any) {
    if (userId) await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    return jsonError(error?.message || "Gagal membuat staff.", 500);
  }
}

export async function PATCH(req: Request) {
  const access = await requireManager();
  if ("response" in access) return access.response;
  const { actor } = access;
  const { admin, tenantId } = actor;
  const body = await req.json().catch(() => ({}));

  const userId = String(body.user_id ?? "");
  if (!userId) return jsonError("Staff tidak valid.");

  const { data: target, error: targetError } = await admin
    .from("tenant_memberships")
    .select("role,status")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();
  if (targetError) return jsonError(targetError.message, 500);
  if (!target) return jsonError("Staff tidak ditemukan.", 404);
  if (target.role === "owner") return jsonError("Owner utama tidak dapat diubah dari Manajemen Staff.", 403);
  if (actor.role === "admin" && target.role === "admin") return jsonError("Admin tidak dapat mengubah Admin lain.", 403);

  const role = String(body.role ?? target.role) as StaffRole;
  const status = String(body.status ?? target.status);
  if (!STAFF_ROLES.includes(role)) return jsonError("Role staff tidak valid.");
  if (!["active", "inactive"].includes(status)) return jsonError("Status staff tidak valid.");
  if (actor.role === "admin" && role === "admin") return jsonError("Hanya Owner yang dapat menetapkan role Admin.", 403);

  const fullName = String(body.full_name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const newPassword = String(body.password ?? "");
  const requestedBranchIds = Array.isArray(body.branch_ids) ? body.branch_ids.map(String) : [];

  let branchIds: string[] = [];
  try {
    branchIds = await validateBranchIds(admin, tenantId, requestedBranchIds);
    if (!branchIds.length && status === "active") {
      const { data: activeBranches, error } = await admin.from("branches").select("id").eq("tenant_id", tenantId).eq("is_active", true);
      if (error) throw error;
      branchIds = (activeBranches ?? []).map((b: any) => String(b.id));
    }
  } catch (error: any) {
    return jsonError(error?.message || "Cabang tidak valid.");
  }

  const authPatch: Record<string, any> = { user_metadata: { full_name: fullName, phone } };
  if (email) authPatch.email = email;
  if (newPassword) {
    if (newPassword.length < 8) return jsonError("Password baru minimal 8 karakter.");
    authPatch.password = newPassword;
  }

  const authUpdate = await admin.auth.admin.updateUserById(userId, authPatch);
  if (authUpdate.error) return jsonError(authUpdate.error.message, 500);

  const profileUpdate = await admin.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("id", userId);
  if (profileUpdate.error) return jsonError(profileUpdate.error.message, 500);

  const membershipUpdate = await admin.from("tenant_memberships").update({ role, status }).eq("tenant_id", tenantId).eq("user_id", userId);
  if (membershipUpdate.error) return jsonError(membershipUpdate.error.message, 500);

  const removeBranches = await admin.from("branch_memberships").delete().eq("tenant_id", tenantId).eq("user_id", userId);
  if (removeBranches.error) return jsonError(removeBranches.error.message, 500);

  if (status === "active" && branchIds.length) {
    const branchInsert = await admin.from("branch_memberships").insert(branchIds.map((branchId) => ({
      tenant_id: tenantId,
      branch_id: branchId,
      user_id: userId,
      is_active: true,
    })));
    if (branchInsert.error) return jsonError(branchInsert.error.message, 500);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const access = await requireManager();
  if ("response" in access) return access.response;
  const { actor } = access;
  const { admin, tenantId } = actor;
  const body = await req.json().catch(() => ({}));
  const userId = String(body.user_id ?? "");
  if (!userId) return jsonError("Staff tidak valid.");

  const { data: target, error } = await admin.from("tenant_memberships").select("role").eq("tenant_id", tenantId).eq("user_id", userId).maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!target) return jsonError("Staff tidak ditemukan.", 404);
  if (target.role === "owner") return jsonError("Owner utama tidak dapat dihapus.", 403);
  if (actor.role === "admin" && target.role === "admin") return jsonError("Admin tidak dapat menghapus akses Admin lain.", 403);

  const membershipUpdate = await admin.from("tenant_memberships").update({ status: "inactive" }).eq("tenant_id", tenantId).eq("user_id", userId);
  if (membershipUpdate.error) return jsonError(membershipUpdate.error.message, 500);
  const branchUpdate = await admin.from("branch_memberships").update({ is_active: false }).eq("tenant_id", tenantId).eq("user_id", userId);
  if (branchUpdate.error) return jsonError(branchUpdate.error.message, 500);

  return NextResponse.json({ success: true, mode: "soft_remove" });
}
