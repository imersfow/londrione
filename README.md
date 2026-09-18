# LondriOne

**The Operating System for Modern Laundry Business.**

Full source code white-label laundry operating system built with Next.js + Supabase + Vercel + GitHub.

## Deployment model
- One installation = one laundry business.
- Multi-branch remains supported inside one installation.
- Owner first account is created only through `/setup` on a fresh installation.
- After an Owner exists, public registration is not used; Owner/Admin creates staff from **Staff & Akses**.
- Staff roles: Owner, Admin, Manager, Cashier, Production, Courier.
- Branch access is assigned per staff account.
- Recommended operational target in documentation: up to ~20 branches per installation, not a hard technical limit.

## Current modules
- Owner Command Center dashboard
- Orders / POS foundation
- Production board
- Customers
- Services and branch pricing foundation
- Branch management
- Expenses
- Staff & role/branch access management
- Notification gateway settings
- Optional multi-channel login OTP
- Forgot/reset password

## Environment
Configure in Vercel/server environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (server-only, never expose in browser/GitHub)

## Security after first setup
For a production installation, disable public email sign-ups in Supabase Auth. Staff creation uses the server-side Supabase Admin API, so public sign-up is not required.

## Next blueprint stage
White-label settings + optional dynamic public homepage + custom HTML homepage.
