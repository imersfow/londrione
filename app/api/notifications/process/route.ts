import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { safeExcerpt, sendProviderMessage } from "@/lib/notification-providers";
import { getProviderRuntime, workerJobPayload } from "@/lib/notification-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success:false, message:"Belum login." }, { status:401 });

    const { data: membership } = await supabase.from("tenant_memberships")
      .select("tenant_id,role,status").eq("user_id",user.id).eq("status","active").limit(1).maybeSingle();
    if (!membership) return NextResponse.json({ success:false, message:"Akses bisnis tidak ditemukan." }, { status:403 });

    const body = await request.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit ?? 10),1),30);
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("stage4_claim_notification_jobs", { p_limit:limit });
    if (error) throw new Error(error.message);
    const rows = Array.isArray(data) ? data : [];
    let sent = 0;
    let failed = 0;
    const results: Array<Record<string,unknown>> = [];

    for (const raw of rows) {
      const row = raw as Record<string,unknown>;
      const job = workerJobPayload(row);
      if (!job.id) continue;
      try {
        if (!job.target) throw new Error(`Target ${job.channel} kosong.`);
        const hasSecret = Object.keys(job.runtime.credentials || {}).length > 0;
        const runtime = (!hasSecret && job.tenantId && job.channel)
          ? await getProviderRuntime(job.tenantId, job.channel)
          : job.runtime;
        const response = await sendProviderMessage({
          runtime,
          target:job.target,
          subject:job.subject,
          message:job.message,
        });
        await admin.rpc("stage4_finish_notification_job", {
          p_job_id:job.id, p_success:true, p_response:safeExcerpt(response), p_error:null,
        });
        if (job.tenantId) await admin.from("notification_delivery_logs").insert({
          tenant_id:job.tenantId,event_key:job.eventKey,channel:job.channel,provider:job.provider,target:job.target,
          subject:job.subject || null,status:"sent",source:"outbox",reference_type:"outbox",reference_id:job.id,
        });
        sent++;
        results.push({ id:job.id, status:"sent", provider:job.provider, channel:job.channel });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Pengiriman gagal.";
        await admin.rpc("stage4_finish_notification_job", {
          p_job_id:job.id, p_success:false, p_response:null, p_error:message,
        });
        if (job.tenantId) await admin.from("notification_delivery_logs").insert({
          tenant_id:job.tenantId,event_key:job.eventKey,channel:job.channel || "whatsapp",provider:job.provider || "unknown",target:job.target || null,
          subject:job.subject || null,status:"failed",error_message:message,source:"outbox",reference_type:"outbox",reference_id:job.id,
        });
        failed++;
        results.push({ id:job.id, status:"failed", error:message });
      }
    }

    return NextResponse.json({ success:true, claimed:rows.length, sent, failed, results });
  } catch (error) {
    return NextResponse.json({ success:false, message:error instanceof Error?error.message:"Worker error." }, { status:500 });
  }
}
