# LondriOne

The Operating System for Modern Laundry Business.

## Stack
- Next.js App Router
- Supabase Auth / Postgres / RLS
- Vercel
- GitHub

## Setup
1. Copy `.env.example` to `.env.local`.
2. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. `npm install`
4. `npm run dev`

Never put Supabase secret/service-role keys in NEXT_PUBLIC variables or browser code.
