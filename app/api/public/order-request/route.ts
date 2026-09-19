import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendDirectTenantEvent } from "@/lib/notification-server";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizePhone(value: unknown) {
  return cleanText(value, 40).replace(/[^0-9+]/g, "");
}

function validMethod(branch: any, method: string) {
  if (method === "after_weighing") return true;
  if (method === "cash") return branch.public_cash_enabled === true;
  if (method === "bank_transfer") return branch.public_transfer_enabled === true;
  if (method === "qris") return branch.public_qris_enabled === true;
  if (method === "ewallet") return branch.public_ewallet_enabled === true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (cleanText(body?.website, 100)) return NextResponse.json({ success: true }, { status: 200 });

    const branchId = cleanText(body?.branch_id, 80);
    const requestType = cleanText(body?.request_type, 20) === "dropoff" ? "dropoff" : "pickup";
    const customerName = cleanText(body?.customer_name, 160);
    const customerPhone = normalizePhone(body?.customer_phone);
    const customerEmail = cleanText(body?.customer_email, 200) || null;
    const address = cleanText(body?.address, 1000) || null;
    const mapUrl = cleanText(body?.map_url, 1000) || null;
    const notes = cleanText(body?.notes, 2000) || null;
    const requestedAt = cleanText(body?.requested_at, 80) || null;
    const requestedMethod = cleanText(body?.payment_preference, 40) || "after_weighing";
    const rawItems = Array.isArray(body?.items) ? body.items.slice(0, 20) : [];

    if (!branchId || !customerName || !customerPhone) {
      return NextResponse.json({ error: "Nama, WhatsApp, dan cabang wajib diisi." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: branch, error: branchError } = await admin
      .from("branches")
      .select("id,tenant_id,name,is_active,pickup_enabled,online_order_enabled,online_pickup_enabled,online_dropoff_enabled,online_payment_timing,online_deposit_amount,public_cash_enabled,public_transfer_enabled,public_qris_enabled,public_ewallet_enabled")
      .eq("id", branchId)
      .eq("is_active", true)
      .maybeSingle();

    if (branchError || !branch || branch.online_order_enabled !== true) {
      return NextResponse.json({ error: "Order online belum aktif di cabang ini." }, { status: 400 });
    }

    if (requestType === "pickup" && (!(branch.pickup_enabled === true) || branch.online_pickup_enabled === false)) {
      return NextResponse.json({ error: "Pickup online belum tersedia di cabang ini." }, { status: 400 });
    }
    if (requestType === "dropoff" && branch.online_dropoff_enabled === false) {
      return NextResponse.json({ error: "Drop-off online belum tersedia di cabang ini." }, { status: 400 });
    }
    if (requestType === "pickup" && !address) {
      return NextResponse.json({ error: "Alamat pickup wajib diisi." }, { status: 400 });
    }

    const { data: catalogRows, error: catalogError } = await admin.rpc("get_cashier_catalog", { p_branch_id: branchId });
    if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: 400 });
    const catalog = (Array.isArray(catalogRows) ? catalogRows : []).filter((row: any) => row.public_visible !== false);
    const byId = new Map(catalog.map((row: any) => [String(row.service_id), row]));

    const items = rawItems
      .map((raw: any) => {
        const serviceId = cleanText(raw?.service_id, 80);
        const service = byId.get(serviceId) as any;
        if (!service) return null;
        const quantity = Math.max(0.1, Number(raw?.quantity || service.resolved_min_quantity || 1));
        const priceVisible = service.show_public_price !== false;
        const price = priceVisible ? Number(service.resolved_price || 0) : 0;
        return {
          service_id: serviceId,
          service_name: String(service.service_name || "Laundry"),
          pricing_mode: String(service.pricing_mode || "weight"),
          unit_label: String(service.unit_label || "unit"),
          quantity,
          price_snapshot: priceVisible ? price : null,
          estimated_subtotal: priceVisible ? quantity * price : 0,
          notes: cleanText(raw?.notes, 500) || null,
          price_visible: priceVisible,
        };
      })
      .filter(Boolean) as any[];

    const estimatedAmount = items.reduce((sum, item) => sum + Number(item.estimated_subtotal || 0), 0);
    const hasWeight = items.some((item) => item.pricing_mode === "weight");
    let paymentTiming = String(branch.online_payment_timing || "after_weighing");
    let dueNow = 0;

    if (paymentTiming === "deposit") {
      dueNow = Math.max(0, Math.min(Number(branch.online_deposit_amount || 0), estimatedAmount || Number(branch.online_deposit_amount || 0)));
    } else if (paymentTiming === "upfront") {
      if (hasWeight || items.some((item) => !item.price_visible) || estimatedAmount <= 0) {
        paymentTiming = "after_weighing";
        dueNow = 0;
      } else {
        dueNow = estimatedAmount;
      }
    }

    let paymentPreference = requestedMethod;
    if (paymentTiming === "after_weighing") paymentPreference = "after_weighing";
    if (!validMethod(branch, paymentPreference)) {
      if (paymentTiming === "after_weighing") paymentPreference = "after_weighing";
      else if (branch.public_qris_enabled) paymentPreference = "qris";
      else if (branch.public_transfer_enabled) paymentPreference = "bank_transfer";
      else if (branch.public_ewallet_enabled) paymentPreference = "ewallet";
      else if (branch.public_cash_enabled) paymentPreference = "cash";
      else paymentPreference = "after_weighing";
    }

    const { data: existingCustomer } = await admin
      .from("customers")
      .select("id")
      .eq("tenant_id", branch.tenant_id)
      .eq("phone", customerPhone)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    const { data: requestRow, error: requestError } = await admin
      .from("online_order_requests")
      .insert({
        tenant_id: branch.tenant_id,
        branch_id: branch.id,
        customer_id: existingCustomer?.id || null,
        request_number: "",
        request_type: requestType,
        status: "new",
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        address,
        map_url: mapUrl,
        requested_at: requestedAt ? new Date(requestedAt).toISOString() : null,
        notes,
        estimated_amount: estimatedAmount,
        payment_timing: paymentTiming,
        payment_due_now: dueNow,
        payment_preference: paymentPreference,
        source: "homepage",
      })
      .select("id,request_number,public_token,status,estimated_amount,payment_timing,payment_due_now,payment_preference")
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: requestError?.message || "Gagal membuat request." }, { status: 400 });
    }

    if (items.length) {
      const payload = items.map((item) => ({
        request_id: requestRow.id,
        tenant_id: branch.tenant_id,
        branch_id: branch.id,
        service_id: item.service_id,
        service_name: item.service_name,
        pricing_mode: item.pricing_mode,
        unit_label: item.unit_label,
        quantity: item.quantity,
        price_snapshot: item.price_snapshot,
        estimated_subtotal: item.estimated_subtotal,
        notes: item.notes,
      }));
      const { error: itemError } = await admin.from("online_order_request_items").insert(payload);
      if (itemError) {
        await admin.from("online_order_requests").delete().eq("id", requestRow.id);
        return NextResponse.json({ error: itemError.message }, { status: 400 });
      }
    }

    const origin = new URL(req.url).origin;
    const { data: tenant } = await admin.from("tenants").select("name").eq("id", branch.tenant_id).maybeSingle();
    try {
      await sendDirectTenantEvent({
        tenantId: branch.tenant_id,
        eventKey: "online_request_received",
        targets: { whatsapp: customerPhone, email: customerEmail },
        vars: {
          tenant_name: tenant?.name || "Laundry",
          customer_name: customerName,
          request_number: requestRow.request_number,
          request_type: requestType === "pickup" ? "Pickup" : "Drop-off",
          branch_name: branch.name,
          tracking_url: `${origin}/track/${requestRow.public_token}`,
        },
        referenceType: "online_request",
        referenceId: requestRow.id,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      ...requestRow,
      tracking_url: `/track/${requestRow.public_token}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Server error." }, { status: 500 });
  }
}
