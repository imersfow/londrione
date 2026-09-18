# LondriOne Stage 2A.2 - Navigation Performance

Hotfix ini mengurangi request berulang saat pindah menu:

- `getAppContext()` dimemoize per server request dengan React `cache()` sehingga DashboardWrapper, RoleGuard dan page tidak mengulang auth/membership/branch/OTP context pada render yang sama.
- Supabase browser client dijadikan singleton agar tidak membuat client baru setiap render/menu.
- Client pages memakai session lokal untuk mendapatkan user; keamanan data tetap dipaksa oleh RLS Supabase.
- Root `app/loading.tsx` memberi feedback instan saat route sedang mengambil data.

Tidak ada SQL baru.

Rekomendasi Vercel: karena Supabase project LondriOne berada di Tokyo, set Vercel Function Region ke Tokyo (`hnd1`) bila opsi tersedia, lalu redeploy.
