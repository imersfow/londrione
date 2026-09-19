import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getProviderRuntime } from "@/lib/notification-server";
import { safeExcerpt, sendProviderMessage } from "@/lib/notification-providers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success:false, message:"Belum login." }, { status:401 });

  const body = await request.json().catch(() => ({}));
  const tenantId = String(body.tenant_id ?? "");
  const channel = String(body.channel ?? "").toLowerCase();
  const target = String(body.target ?? "").trim();
  if (!tenantId || !["whatsapp","email","telegram"].includes(channel) || !target) {
    return NextResponse.json({ success:false, message:"Tenant, channel, dan target tes wajib diisi." }, { status:400 });
  }

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role,status")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("status","active")
    .maybeSingle();
  if (!membership || !["owner","admin"].includes(String(membership.role))) {
    return NextResponse.json({ success:false, message:"Hanya Owner/Admin yang boleh melakukan test provider." }, { status:403 });
  }

  const admin = createAdminClient();
  let provider = "";
  try {
    const runtime = await getProviderRuntime(tenantId, channel);
    provider = String(runtime.provider || "");
    const subject = `Tes ${channel.toUpperCase()} - LondriOne`;
    const message = channel === "email"
      ? `<h2>Tes koneksi berhasil</h2><p>Email ini dikirim dari provider <b>${provider}</b> pada LondriOne.</p>`
      : `Tes koneksi ${channel} dari LondriOne. Jika pesan ini diterima, provider ${provider} sudah terhubung.`;
    const response = await sendProviderMessage({ runtime, target, subject, message });
    await admin.from("notification_channels").update({
      last_test_status:"success",
      last_test_message:"Test berhasil dikirim.",
      last_tested_at:new Date().toISOString(),
      last_test_target:target,
    }).eq("tenant_id",tenantId).eq("channel",channel);
    await admin.from("notification_test_logs").insert({
      tenant_id:tenantId, channel, provider, target, status:"success",
      message:"Test berhasil dikirim.", response_excerpt:safeExcerpt(response), created_by:user.id,
    });
    return NextResponse.json({ success:true, provider, message:"Test berhasil dikirim. Cek target Anda." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test provider gagal.";
    await admin.from("notification_channels").update({
      last_test_status:"failed", last_test_message:message,
      last_tested_at:new Date().toISOString(), last_test_target:target,
    }).eq("tenant_id",tenantId).eq("channel",channel);
    await admin.from("notification_test_logs").insert({
      tenant_id:tenantId, channel, provider:provider || "unknown", target, status:"failed", message, created_by:user.id,
    });
    return NextResponse.json({ success:false, message }, { status:400 });
  }
}
