import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success:false }, { status:401 });
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles")
    .select("full_name,phone,telegram_chat_id,telegram_username")
    .eq("id",user.id).maybeSingle();
  return NextResponse.json({ success:true, email:user.email || "", profile:profile || {} });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success:false, message:"Belum login." }, { status:401 });
  const body = await request.json().catch(() => ({}));
  const phone = String(body.phone ?? "").trim() || null;
  const telegramChatId = String(body.telegram_chat_id ?? "").trim() || null;
  const telegramUsername = String(body.telegram_username ?? "").trim().replace(/^@/, "") || null;
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({
    phone,
    telegram_chat_id:telegramChatId,
    telegram_username:telegramUsername,
    telegram_linked_at: telegramChatId ? new Date().toISOString() : null,
    updated_at:new Date().toISOString(),
  }).eq("id",user.id);
  if (error) return NextResponse.json({ success:false, message:error.message }, { status:400 });
  return NextResponse.json({ success:true, message:"Tujuan OTP akun diperbarui." });
}
