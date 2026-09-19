import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendDirectTenantEvent } from "@/lib/notification-server";

export const runtime = "nodejs";

const eventMap: Record<string,string> = {
  confirmed:"online_request_confirmed",
  courier_on_the_way:"pickup_courier_on_the_way",
  picked_up:"pickup_picked_up",
  arrived:"pickup_arrived",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success:false, message:"Belum login." }, { status:401 });
  const body = await request.json().catch(() => ({}));
  const requestId = String(body.request_id ?? "");
  const status = String(body.status ?? "");
  const eventKey = eventMap[status];
  if (!requestId || !eventKey) return NextResponse.json({ success:true, skipped:true });

  const admin = createAdminClient();
  const { data: row, error } = await admin.from("online_order_requests")
    .select("id,tenant_id,branch_id,request_number,request_type,customer_name,customer_phone,customer_email,public_token,branches(name)")
    .eq("id",requestId).maybeSingle();
  if (error || !row) return NextResponse.json({ success:false, message:error?.message || "Request tidak ditemukan." }, { status:404 });

  const { data: membership } = await supabase.from("tenant_memberships").select("role")
    .eq("tenant_id",row.tenant_id).eq("user_id",user.id).eq("status","active").maybeSingle();
  if (!membership) return NextResponse.json({ success:false, message:"Tidak memiliki akses." }, { status:403 });

  const baseUrl = new URL(request.url).origin;
  const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches as {name?:string}|null;
  const { data: tenant } = await admin.from("tenants").select("name").eq("id", row.tenant_id).maybeSingle();
  const results = await sendDirectTenantEvent({
    tenantId:row.tenant_id,
    eventKey,
    targets:{ whatsapp:row.customer_phone, email:row.customer_email },
    vars:{
      tenant_name:tenant?.name || "Laundry",
      customer_name:row.customer_name,
      request_number:row.request_number,
      request_type:row.request_type === "pickup" ? "Pickup" : "Drop-off",
      branch_name:branch?.name || "Cabang",
      tracking_url:`${baseUrl}/track/${row.public_token}`,
    },
    referenceType:"online_request",
    referenceId:row.id,
  });
  return NextResponse.json({ success:true, results });
}
