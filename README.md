# LondriOne

**The Operating System for Modern Laundry Business.**

Stack: Next.js + Supabase + Vercel + GitHub.

## Frontend Phase 2
- Owner Command Center dashboard
- Multi-branch management
- Customer CRM CRUD
- Laundry service CRUD
- Multi-item order entry
- Production board
- Order workflow + payments + status history
- Expense recording + void
- BYOK notification settings: Fonnte, StarSender, Mailketing, SMTP, Gmail, Telegram
- Notification template editor
- Business settings
- Responsive desktop/mobile navigation

## Environment
Copy `.env.example` and configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never expose a Supabase secret/service-role key in browser code or GitHub.

## Phase 2.1 Auth Complete

Tambahan:
- Register: nama, WhatsApp, email, password + konfirmasi.
- Forgot password + reset password via Supabase Auth email.
- Login OTP opsional setelah password berhasil.
- User hanya melihat channel OTP yang benar-benar aktif/configured dan memiliki target: WhatsApp / Email / Telegram.
- Owner/Admin mengatur `Require OTP on Login`, channel yang diizinkan, expiry, cooldown, dan max attempts dari menu Notifikasi.
- OTP 6 digit disimpan sebagai bcrypt hash di schema `private`, tidak plaintext.
- Provider OTP mengikuti BYOK tenant: Fonnte/StarSender, Mailketing/SMTP/Gmail, Telegram.

### Wajib sebelum mengaktifkan OTP
1. Jalankan `supabase_auth_otp_phase2_1.sql` di Supabase SQL Editor.
2. Tambahkan Vercel server-only environment variable `SUPABASE_SECRET_KEY` dengan Supabase Secret Key yang sudah di-rotate. JANGAN memakai prefix `NEXT_PUBLIC_`.
3. Redeploy Vercel setelah environment variable ditambahkan.
4. Pastikan minimal satu Notification Channel aktif dan credential configured sebelum menyalakan Require OTP.
