import { createAdminClient } from "@/lib/supabase-admin";
import { renderTemplate, safeExcerpt, sendProviderMessage, type ProviderRuntime } from "@/lib/notification-providers";

export async function getProviderRuntime(tenantId: string, channel: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_notification_provider_runtime", {
    p_tenant_id: tenantId,
    p_channel: channel,
  });
  if (error) throw new Error(error.message);
  return (data ?? {}) as ProviderRuntime;
}

export async function sendDirectTenantEvent(args: {
  tenantId: string;
  eventKey: string;
  targets: { whatsapp?: string | null; email?: string | null; telegram?: string | null };
  vars: Record<string, unknown>;
  referenceType?: string;
  referenceId?: string | null;
}) {
  const admin = createAdminClient();
  const { data: templates, error } = await admin
    .from("notification_templates")
    .select("event_key,channel,subject,body,is_active")
    .eq("tenant_id", args.tenantId)
    .eq("event_key", args.eventKey)
    .eq("is_active", true);
  if (error) throw new Error(error.message);

  const results: Array<Record<string, unknown>> = [];
  for (const template of templates ?? []) {
    const channel = String(template.channel) as "whatsapp" | "email" | "telegram";
    const target = String(args.targets[channel] ?? "").trim();
    if (!target) continue;

    let runtime: ProviderRuntime;
    try {
      runtime = await getProviderRuntime(args.tenantId, channel);
      if (!runtime.is_enabled || !runtime.credentials_configured) continue;
    } catch {
      continue;
    }

    const subject = renderTemplate(template.subject, args.vars);
    const message = renderTemplate(template.body, args.vars);
    try {
      const response = await sendProviderMessage({ runtime, target, subject, message });
      await admin.from("notification_delivery_logs").insert({
        tenant_id: args.tenantId,
        event_key: args.eventKey,
        channel,
        provider: runtime.provider,
        target,
        subject: subject || null,
        status: "sent",
        source: "direct",
        reference_type: args.referenceType || null,
        reference_id: args.referenceId || null,
      });
      results.push({ channel, status: "sent", response: safeExcerpt(response, 300) });
    } catch (error) {
      await admin.from("notification_delivery_logs").insert({
        tenant_id: args.tenantId,
        event_key: args.eventKey,
        channel,
        provider: runtime.provider,
        target,
        subject: subject || null,
        status: "failed",
        error_message: error instanceof Error ? error.message : "Pengiriman gagal",
        source: "direct",
        reference_type: args.referenceType || null,
        reference_id: args.referenceId || null,
      });
      results.push({ channel, status: "failed", error: error instanceof Error ? error.message : "Pengiriman gagal" });
    }
  }
  return results;
}

function pick(row: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return fallback;
}

export function workerJobPayload(row: Record<string, unknown>) {
  const channel = pick(row, ["channel"]);
  const target = channel === "email"
    ? pick(row, ["target","recipient","customer_email","email"])
    : channel === "telegram"
      ? pick(row, ["target","recipient","customer_telegram_chat_id","telegram_chat_id"])
      : pick(row, ["target","recipient","customer_phone","phone"]);

  const vars: Record<string, unknown> = {
    tenant_name: pick(row,["tenant_name","business_name"],"Laundry"),
    branch_name: pick(row,["branch_name"],""),
    customer_name: pick(row,["customer_name"],"Pelanggan"),
    customer_phone: pick(row,["customer_phone"],""),
    customer_email: pick(row,["customer_email"],""),
    order_number: pick(row,["order_number"],""),
    status: pick(row,["status","order_status"],""),
    status_label: pick(row,["status_label"],pick(row,["status","order_status"],"")),
    payment_status: pick(row,["payment_status"],""),
    payment_status_label: pick(row,["payment_status_label"],pick(row,["payment_status"],"")),
    grand_total: pick(row,["grand_total"],"0"),
    paid_amount: pick(row,["paid_amount"],"0"),
    balance_due: pick(row,["balance_due"],"0"),
    tracking_url: pick(row,["tracking_url"],""),
  };

  const subjectTemplate = pick(row,["template_subject","subject"],"");
  const bodyTemplate = pick(row,["template_body","body","message"],"");
  return {
    id: pick(row,["id","job_id","outbox_id"]),
    tenantId: pick(row,["tenant_id"]),
    eventKey: pick(row,["event_key"],"notification"),
    channel,
    provider: pick(row,["provider"]),
    target,
    subject: renderTemplate(subjectTemplate, vars),
    message: renderTemplate(bodyTemplate, vars),
    runtime: {
      channel,
      provider: pick(row,["provider"]),
      is_enabled: true,
      credentials_configured: true,
      public_config: (row.public_config && typeof row.public_config === "object") ? row.public_config as Record<string,unknown> : {},
      credentials: (row.credentials && typeof row.credentials === "object") ? row.credentials as Record<string,unknown> : {},
    } satisfies ProviderRuntime,
  };
}
