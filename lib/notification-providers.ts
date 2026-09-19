import nodemailer from "nodemailer";

export type ProviderRuntime = {
  tenant_id?: string;
  channel: "whatsapp" | "email" | "telegram" | string;
  provider: string;
  is_enabled?: boolean;
  credentials_configured?: boolean;
  public_config?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
};

export type ProviderSendInput = {
  runtime: ProviderRuntime;
  target: string;
  subject?: string | null;
  message: string;
};

export function cleanPhone(value: string) {
  let number = String(value ?? "").replace(/[^0-9]/g, "");
  if (number.startsWith("08")) number = "62" + number.slice(1);
  else if (number.startsWith("8")) number = "62" + number;
  return number;
}

function stripHtml(value: string) {
  return String(value ?? "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

async function readResponse(response: Response) {
  const raw = await response.text();
  if (!raw) return { raw: "" };
  try { return JSON.parse(raw); } catch { return { raw }; }
}

function providerFailed(data: unknown) {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (obj.error || obj.errors) return true;
  if (obj.success === false || obj.status === false) return true;
  const status = String(obj.status ?? "").toLowerCase();
  return ["failed", "error", "false"].includes(status);
}

export async function sendProviderMessage({ runtime, target, subject, message }: ProviderSendInput) {
  const provider = String(runtime.provider ?? "").toLowerCase();
  const config = runtime.public_config ?? {};
  const credentials = runtime.credentials ?? {};

  if (!runtime.is_enabled) throw new Error("Channel belum diaktifkan.");
  if (!runtime.credentials_configured && Object.keys(credentials).length === 0) throw new Error("Credential provider belum tersimpan.");
  if (!target.trim()) throw new Error("Target pengiriman masih kosong.");

  if (provider === "fonnte") {
    const token = String(credentials.api_token ?? "").trim();
    if (!token) throw new Error("Token Fonnte belum tersimpan.");
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ target: cleanPhone(target), message: stripHtml(message) }),
    });
    const data = await readResponse(response);
    if (!response.ok || providerFailed(data)) throw new Error(`Fonnte gagal (HTTP ${response.status}).`);
    return data;
  }

  if (provider === "starsender") {
    const token = String(credentials.api_token ?? "").trim();
    if (!token) throw new Error("Token StarSender belum tersimpan.");
    const response = await fetch("https://api.starsender.online/api/send", {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ messageType: "text", to: cleanPhone(target), body: stripHtml(message) }),
    });
    const data = await readResponse(response);
    if (!response.ok || providerFailed(data)) throw new Error(`StarSender gagal (HTTP ${response.status}).`);
    return data;
  }

  if (provider === "mailketing") {
    const token = String(credentials.api_token ?? "").trim();
    const fromName = String(config.from_name ?? "LondriOne").trim();
    const fromEmail = String(config.from_email ?? "").trim();
    const apiUrl = String(config.api_url ?? "https://api.mailketing.co.id/api/v1/send").trim();
    if (!token || !fromEmail) throw new Error("Mailketing API token / From Email belum lengkap.");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        from_name: fromName,
        from_email: fromEmail,
        recipient: target.trim(),
        subject: String(subject || "Notifikasi Laundry"),
        content: message,
        api_token: token,
      }),
    });
    const data = await readResponse(response);
    if (!response.ok || providerFailed(data)) throw new Error(`Mailketing gagal (HTTP ${response.status}).`);
    return data;
  }

  if (provider === "gmail" || provider === "smtp") {
    let transporter: nodemailer.Transporter;
    let fromAddress = "";
    const fromName = String(config.from_name ?? "LondriOne").trim();

    if (provider === "gmail") {
      const gmailAddress = String(config.gmail_address ?? config.from_email ?? "").trim();
      const password = String(credentials.app_password ?? "");
      if (!gmailAddress || !password) throw new Error("Gmail Address / App Password belum lengkap.");
      transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: gmailAddress, pass: password },
      });
      fromAddress = gmailAddress;
    } else {
      const host = String(config.smtp_host ?? "").trim();
      const port = Number(config.smtp_port ?? 465);
      const user = String(config.smtp_username ?? "").trim();
      const password = String(credentials.password ?? "");
      const secureMode = String(config.smtp_secure ?? "ssl");
      fromAddress = String(config.from_email ?? user).trim();
      if (!host || !user || !password || !fromAddress) throw new Error("Konfigurasi SMTP belum lengkap.");
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: secureMode === "ssl",
        auth: { user, pass: password },
        ...(secureMode === "none" ? { ignoreTLS: true } : {}),
      });
    }

    const info = await transporter.sendMail({
      from: { name: fromName, address: fromAddress },
      to: target.trim(),
      subject: String(subject || "Notifikasi Laundry"),
      text: stripHtml(message),
      html: message.includes("<") ? message : message.replace(/\n/g, "<br>"),
    });
    return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
  }

  if (provider === "telegram") {
    const botToken = String(credentials.bot_token ?? "").trim();
    if (!botToken) throw new Error("Bot Token Telegram belum tersimpan.");
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: target.trim(), text: stripHtml(message) }),
    });
    const data = await readResponse(response) as { ok?: boolean } & Record<string, unknown>;
    if (!response.ok || data?.ok !== true) throw new Error(`Telegram gagal (HTTP ${response.status}).`);
    return data;
  }

  throw new Error(`Provider ${provider || "?"} belum didukung.`);
}

export function renderTemplate(template: string | null | undefined, vars: Record<string, unknown>) {
  let output = String(template ?? "");
  for (const [key, value] of Object.entries(vars)) {
    output = output.split(`{${key}}`).join(String(value ?? ""));
  }
  return output;
}

export function safeExcerpt(value: unknown, max = 1200) {
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    return text.length > max ? text.slice(0, max) + "…" : text;
  } catch {
    return String(value ?? "").slice(0, max);
  }
}
