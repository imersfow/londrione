import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type Challenge = {
  challenge_id: string;
  channel: string;
  provider: string;
  target: string;
  masked_target: string;
  tenant_name: string;
  code: string;
  expire_minutes: number;
  resend_cooldown_seconds: number;
  public_config: Record<string, unknown>;
  credentials: Record<string, unknown>;
  template_subject?: string | null;
  template_body?: string | null;
};

function cleanPhone(value: string) {
  let number = String(value ?? "").replace(/[^0-9]/g, "");
  if (number.startsWith("08")) number = "62" + number.slice(1);
  else if (number.startsWith("8")) number = "62" + number;
  return number;
}

function render(template: string | null | undefined, row: Challenge) {
  return String(template ?? "")
    .split("{otp}").join(row.code)
    .split("{tenant_name}").join(row.tenant_name || "LondriOne")
    .split("{expire_minutes}").join(String(row.expire_minutes ?? 5));
}

async function parseResponse(response: Response) {
  const raw = await response.text();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return { raw }; }
}

function hasProviderError(data: unknown) {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (obj.error || obj.errors) return true;
  const status = String(obj.status ?? "").toLowerCase();
  const success = String(obj.success ?? "").toLowerCase();
  return obj.status === false || obj.success === false || ["false", "failed", "error"].includes(status) || success === "false";
}

async function sendHttpOtp(row: Challenge, subject: string, message: string) {
  const config = row.public_config ?? {};
  const creds = row.credentials ?? {};

  if (row.provider === "fonnte") {
    const token = String(creds.api_token ?? "").trim();
    const body = new URLSearchParams({ target: cleanPhone(row.target), message });
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = await parseResponse(response);
    if (!response.ok || hasProviderError(data)) throw new Error("Pengiriman OTP via Fonnte gagal.");
    return;
  }

  if (row.provider === "starsender") {
    const token = String(creds.api_token ?? "").trim();
    const response = await fetch("https://api.starsender.online/api/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messageType: "text",
        to: cleanPhone(row.target),
        body: message,
      }),
    });
    const data = await parseResponse(response);
    if (!response.ok || hasProviderError(data)) throw new Error("Pengiriman OTP via StarSender gagal.");
    return;
  }

  if (row.provider === "mailketing") {
    const token = String(creds.api_token ?? "").trim();
    const fromName = String(config.from_name ?? row.tenant_name ?? "LondriOne");
    const fromEmail = String(config.from_email ?? "").trim();
    const apiUrl = String(config.api_url ?? "https://api.mailketing.co.id/api/v1/send").trim();

    if (!fromEmail) throw new Error("From Email Mailketing belum diisi.");

    const body = new URLSearchParams({
      from_name: fromName,
      from_email: fromEmail,
      recipient: row.target,
      subject: subject || `Kode OTP ${row.tenant_name}`,
      content: message,
      api_token: token,
    });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await parseResponse(response);
    if (!response.ok || hasProviderError(data)) throw new Error("Pengiriman OTP via Mailketing gagal.");
    return;
  }

  if (row.provider === "telegram") {
    const botToken = String(creds.bot_token ?? "").trim();
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: row.target, text: message }),
    });
    const data = await parseResponse(response) as { ok?: boolean } | null;
    if (!response.ok || data?.ok !== true) throw new Error("Pengiriman OTP via Telegram gagal.");
    return;
  }

  throw new Error(`Provider ${row.provider} bukan provider HTTP OTP.`);
}

async function sendSmtpOtp(row: Challenge, subject: string, message: string) {
  const config = row.public_config ?? {};
  const creds = row.credentials ?? {};

  if (row.provider === "gmail") {
    const gmail = String(config.gmail_address ?? config.from_email ?? "").trim();
    const password = String(creds.app_password ?? "");
    if (!gmail || !password) throw new Error("Gmail/App Password belum lengkap.");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmail, pass: password },
    });

    await transporter.sendMail({
      from: { name: String(config.from_name ?? row.tenant_name ?? "LondriOne"), address: gmail },
      to: row.target,
      subject: subject || `Kode OTP ${row.tenant_name}`,
      text: message,
    });
    return;
  }

  if (row.provider === "smtp") {
    const host = String(config.smtp_host ?? "").trim();
    const port = Number(config.smtp_port ?? 465);
    const user = String(config.smtp_username ?? "").trim();
    const password = String(creds.password ?? "");
    const secureMode = String(config.smtp_secure ?? "ssl");
    const fromEmail = String(config.from_email ?? user).trim();

    if (!host || !user || !password || !fromEmail) throw new Error("Konfigurasi SMTP belum lengkap.");

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: secureMode === "ssl",
      auth: { user, pass: password },
      ...(secureMode === "none" ? { ignoreTLS: true } : {}),
    });

    await transporter.sendMail({
      from: { name: String(config.from_name ?? row.tenant_name ?? "LondriOne"), address: fromEmail },
      to: row.target,
      subject: subject || `Kode OTP ${row.tenant_name}`,
      text: message,
    });
    return;
  }

  throw new Error(`Provider ${row.provider} bukan provider SMTP OTP.`);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Session login tidak ditemukan." }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const channel = String(payload?.channel ?? "").toLowerCase();

    if (!["whatsapp", "email", "telegram"].includes(channel)) {
      return NextResponse.json({ success: false, message: "Channel OTP tidak valid." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("create_auth_otp_challenge", {
      p_user_id: user.id,
      p_channel: channel,
    });

    if (error || !data) {
      return NextResponse.json({ success: false, message: error?.message || "Gagal membuat OTP." }, { status: 400 });
    }

    const row = data as Challenge;
    const subject = render(row.template_subject || `Kode OTP ${row.tenant_name}`, row);
    const message = render(row.template_body, row);

    try {
      if (["smtp", "gmail"].includes(row.provider)) {
        await sendSmtpOtp(row, subject, message);
      } else {
        await sendHttpOtp(row, subject, message);
      }
    } catch (sendError) {
      await admin.rpc("cancel_auth_otp_challenge", { p_challenge_id: row.challenge_id });
      throw sendError;
    }

    return NextResponse.json({
      success: true,
      challenge_id: row.challenge_id,
      channel: row.channel,
      masked_target: row.masked_target,
      expire_minutes: row.expire_minutes,
      resend_cooldown_seconds: row.resend_cooldown_seconds,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "OTP server error." },
      { status: 500 },
    );
  }
}
