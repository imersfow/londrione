-- =========================================================
-- LondriOne Phase 2.1 - Auth Complete + Multi Channel OTP
-- Run once in Supabase SQL Editor BEFORE enabling OTP login.
-- =========================================================

begin;

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------
-- 1. Profile fields used for login OTP destinations
-- ---------------------------------------------------------

alter table public.profiles
add column if not exists telegram_chat_id text;

alter table public.profiles
add column if not exists telegram_username text;

alter table public.profiles
add column if not exists telegram_linked_at timestamptz;

-- Keep profile name + phone from signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    phone
  )
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      ''
    ),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id)
  do update set
    full_name = coalesce(
      nullif(excluded.full_name, ''),
      public.profiles.full_name
    ),
    phone = coalesce(
      nullif(excluded.phone, ''),
      public.profiles.phone
    ),
    updated_at = now();

  return new;
end;
$$;

-- ---------------------------------------------------------
-- 2. Tenant authentication policy
-- ---------------------------------------------------------

create table if not exists public.tenant_auth_settings (
  tenant_id uuid primary key
    references public.tenants(id)
    on delete cascade,

  require_login_otp boolean not null default false,

  allow_whatsapp boolean not null default true,
  allow_email boolean not null default true,
  allow_telegram boolean not null default true,

  otp_expiry_minutes integer not null default 5
    check (otp_expiry_minutes between 1 and 15),

  resend_cooldown_seconds integer not null default 60
    check (resend_cooldown_seconds between 30 and 300),

  max_attempts integer not null default 5
    check (max_attempts between 3 and 10),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tenant_auth_settings enable row level security;

drop trigger if exists trg_tenant_auth_settings_updated_at
on public.tenant_auth_settings;

create trigger trg_tenant_auth_settings_updated_at
before update on public.tenant_auth_settings
for each row
execute function public.set_updated_at();

-- Owner/Admin can manage auth policy from dashboard.
drop policy if exists "tenant_auth_settings_select"
on public.tenant_auth_settings;

create policy "tenant_auth_settings_select"
on public.tenant_auth_settings
for select
to authenticated
using (
  public.has_tenant_role(
    tenant_id,
    array['owner','admin']
  )
);

drop policy if exists "tenant_auth_settings_update"
on public.tenant_auth_settings;

create policy "tenant_auth_settings_update"
on public.tenant_auth_settings
for update
to authenticated
using (
  public.has_tenant_role(
    tenant_id,
    array['owner','admin']
  )
)
with check (
  public.has_tenant_role(
    tenant_id,
    array['owner','admin']
  )
);

grant select, update
on public.tenant_auth_settings
to authenticated;

-- ---------------------------------------------------------
-- 3. Private OTP challenge + verified session storage
-- ---------------------------------------------------------

create table if not exists private.auth_otp_challenges (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  tenant_id uuid not null
    references public.tenants(id)
    on delete cascade,

  channel text not null
    check (channel in ('whatsapp','email','telegram')),

  code_hash text not null,

  expires_at timestamptz not null,

  attempts integer not null default 0,
  max_attempts integer not null default 5,

  verified_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now()
);

alter table private.auth_otp_challenges enable row level security;

revoke all on private.auth_otp_challenges
from public, anon, authenticated;

grant select, insert, update, delete
on private.auth_otp_challenges
to service_role;

create index if not exists idx_auth_otp_challenges_user
on private.auth_otp_challenges(user_id, created_at desc);

create table if not exists private.auth_otp_verifications (
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  tenant_id uuid not null
    references public.tenants(id)
    on delete cascade,

  session_id text not null,
  verified_at timestamptz not null default now(),

  primary key (user_id, session_id)
);

alter table private.auth_otp_verifications enable row level security;

revoke all on private.auth_otp_verifications
from public, anon, authenticated;

grant select, insert, update, delete
on private.auth_otp_verifications
to service_role;

-- ---------------------------------------------------------
-- 4. Mask helpers
-- ---------------------------------------------------------

create or replace function public.mask_auth_email(p_email text)
returns text
language plpgsql
immutable
as $$
declare
  v_local text;
  v_domain text;
begin
  if coalesce(trim(p_email), '') = '' or position('@' in p_email) = 0 then
    return '';
  end if;

  v_local := split_part(p_email, '@', 1);
  v_domain := split_part(p_email, '@', 2);

  return left(v_local, 1)
    || repeat('•', greatest(length(v_local) - 1, 3))
    || '@'
    || v_domain;
end;
$$;

create or replace function public.mask_auth_phone(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
  v_phone text;
begin
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  if length(v_phone) <= 4 then
    return v_phone;
  end if;

  return repeat('•', greatest(length(v_phone) - 4, 4)) || right(v_phone, 4);
end;
$$;

-- ---------------------------------------------------------
-- 5. Seed tenant auth settings + OTP templates
-- ---------------------------------------------------------

create or replace function public.seed_tenant_auth_defaults(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_by uuid;
begin
  select created_by
  into v_created_by
  from public.tenants
  where id = p_tenant_id;

  if not found then
    return;
  end if;

  insert into public.tenant_auth_settings (tenant_id)
  values (p_tenant_id)
  on conflict (tenant_id) do nothing;

  insert into public.notification_templates (
    tenant_id,
    event_key,
    channel,
    subject,
    body,
    is_active,
    created_by,
    updated_by
  )
  values
  (
    p_tenant_id,
    'login_otp',
    'whatsapp',
    null,
    'Kode OTP login {tenant_name}: *{otp}*. Berlaku {expire_minutes} menit. Jangan berikan kode ini kepada siapa pun.',
    true,
    v_created_by,
    v_created_by
  ),
  (
    p_tenant_id,
    'login_otp',
    'email',
    'Kode OTP Login {tenant_name}',
    'Kode OTP login Anda adalah {otp}. Kode berlaku {expire_minutes} menit. Jangan berikan kode ini kepada siapa pun.',
    true,
    v_created_by,
    v_created_by
  ),
  (
    p_tenant_id,
    'login_otp',
    'telegram',
    null,
    '🔐 Kode OTP login {tenant_name}: {otp}\n\nBerlaku {expire_minutes} menit. Jangan berikan kode ini kepada siapa pun.',
    true,
    v_created_by,
    v_created_by
  )
  on conflict (tenant_id, event_key, channel)
  do nothing;
end;
$$;

create or replace function public.handle_tenant_auth_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_tenant_auth_defaults(new.id);
  return new;
end;
$$;

drop trigger if exists on_tenant_create_auth_defaults
on public.tenants;

create trigger on_tenant_create_auth_defaults
after insert on public.tenants
for each row
execute function public.handle_tenant_auth_defaults();

-- Backfill current tenants.
do $$
declare
  r record;
begin
  for r in select id from public.tenants loop
    perform public.seed_tenant_auth_defaults(r.id);
  end loop;
end $$;

-- ---------------------------------------------------------
-- 6. Read OTP availability for CURRENT logged-in user
--    Provider names/secrets are intentionally hidden.
-- ---------------------------------------------------------

create or replace function public.get_my_auth_otp_state()
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
  v_settings public.tenant_auth_settings%rowtype;

  v_email text;
  v_phone text;
  v_telegram_chat_id text;
  v_telegram_username text;

  v_email_available boolean := false;
  v_whatsapp_available boolean := false;
  v_telegram_available boolean := false;

  v_channels jsonb := '[]'::jsonb;
  v_required boolean := false;
  v_verified boolean := false;
  v_session_id text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'User belum login.';
  end if;

  select tm.tenant_id
  into v_tenant_id
  from public.tenant_memberships tm
  where tm.user_id = v_user_id
    and tm.status = 'active'
  order by tm.created_at asc
  limit 1;

  if v_tenant_id is null then
    return jsonb_build_object(
      'has_tenant', false,
      'otp_required', false,
      'otp_verified', true,
      'channels', '[]'::jsonb
    );
  end if;

  select *
  into v_settings
  from public.tenant_auth_settings
  where tenant_id = v_tenant_id;

  if not found then
    perform public.seed_tenant_auth_defaults(v_tenant_id);

    select *
    into v_settings
    from public.tenant_auth_settings
    where tenant_id = v_tenant_id;
  end if;

  select u.email
  into v_email
  from auth.users u
  where u.id = v_user_id;

  select
    p.phone,
    p.telegram_chat_id,
    p.telegram_username
  into
    v_phone,
    v_telegram_chat_id,
    v_telegram_username
  from public.profiles p
  where p.id = v_user_id;

  v_email_available :=
    v_settings.allow_email
    and coalesce(trim(v_email), '') <> ''
    and exists (
      select 1
      from public.notification_channels nc
      where nc.tenant_id = v_tenant_id
        and nc.channel = 'email'
        and nc.is_enabled = true
        and nc.credentials_configured = true
    );

  v_whatsapp_available :=
    v_settings.allow_whatsapp
    and coalesce(trim(v_phone), '') <> ''
    and exists (
      select 1
      from public.notification_channels nc
      where nc.tenant_id = v_tenant_id
        and nc.channel = 'whatsapp'
        and nc.is_enabled = true
        and nc.credentials_configured = true
    );

  v_telegram_available :=
    v_settings.allow_telegram
    and coalesce(trim(v_telegram_chat_id), '') <> ''
    and exists (
      select 1
      from public.notification_channels nc
      where nc.tenant_id = v_tenant_id
        and nc.channel = 'telegram'
        and nc.is_enabled = true
        and nc.credentials_configured = true
    );

  if v_whatsapp_available then
    v_channels := v_channels || jsonb_build_array(
      jsonb_build_object(
        'channel', 'whatsapp',
        'label', 'WhatsApp',
        'masked_target', public.mask_auth_phone(v_phone)
      )
    );
  end if;

  if v_email_available then
    v_channels := v_channels || jsonb_build_array(
      jsonb_build_object(
        'channel', 'email',
        'label', 'Email',
        'masked_target', public.mask_auth_email(v_email)
      )
    );
  end if;

  if v_telegram_available then
    v_channels := v_channels || jsonb_build_array(
      jsonb_build_object(
        'channel', 'telegram',
        'label', 'Telegram',
        'masked_target',
          case
            when coalesce(trim(v_telegram_username), '') <> ''
              then '@' || ltrim(v_telegram_username, '@')
            else 'Telegram terhubung'
          end
      )
    );
  end if;

  -- Safety: never lock an account out when no delivery channel is usable.
  v_required :=
    v_settings.require_login_otp
    and jsonb_array_length(v_channels) > 0;

  v_session_id := coalesce(auth.jwt() ->> 'session_id', '');

  if not v_required then
    v_verified := true;
  elsif v_session_id <> '' then
    v_verified := exists (
      select 1
      from private.auth_otp_verifications av
      where av.user_id = v_user_id
        and av.tenant_id = v_tenant_id
        and av.session_id = v_session_id
    );
  end if;

  return jsonb_build_object(
    'has_tenant', true,
    'tenant_id', v_tenant_id,
    'otp_required', v_required,
    'otp_verified', v_verified,
    'expire_minutes', v_settings.otp_expiry_minutes,
    'resend_cooldown_seconds', v_settings.resend_cooldown_seconds,
    'channels', v_channels
  );
end;
$$;

revoke all on function public.get_my_auth_otp_state()
from public;

grant execute on function public.get_my_auth_otp_state()
to authenticated;

-- ---------------------------------------------------------
-- 7. Enforce OTP on protected pages
-- ---------------------------------------------------------

create or replace function public.is_current_session_otp_verified()
returns boolean
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_state jsonb;
begin
  v_state := public.get_my_auth_otp_state();

  return coalesce((v_state ->> 'otp_verified')::boolean, true);
end;
$$;

revoke all on function public.is_current_session_otp_verified()
from public;

grant execute on function public.is_current_session_otp_verified()
to authenticated;

-- ---------------------------------------------------------
-- 8. Server-only: create challenge and return delivery data
-- ---------------------------------------------------------

create or replace function public.create_auth_otp_challenge(
  p_user_id uuid,
  p_channel text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
declare
  v_tenant_id uuid;
  v_settings public.tenant_auth_settings%rowtype;
  v_channel text;

  v_provider text;
  v_public_config jsonb;
  v_credentials jsonb;

  v_target text;
  v_masked_target text;
  v_tenant_name text;

  v_template_subject text;
  v_template_body text;

  v_code text;
  v_code_number bigint;
  v_random bytea;

  v_challenge_id uuid;
  v_last_created timestamptz;
begin
  if p_user_id is null then
    raise exception 'User tidak valid.';
  end if;

  v_channel := lower(trim(coalesce(p_channel, '')));

  if v_channel not in ('whatsapp','email','telegram') then
    raise exception 'Channel OTP tidak valid.';
  end if;

  select tm.tenant_id
  into v_tenant_id
  from public.tenant_memberships tm
  where tm.user_id = p_user_id
    and tm.status = 'active'
  order by tm.created_at asc
  limit 1;

  if v_tenant_id is null then
    raise exception 'Tenant user tidak ditemukan.';
  end if;

  select *
  into v_settings
  from public.tenant_auth_settings
  where tenant_id = v_tenant_id;

  if not found then
    perform public.seed_tenant_auth_defaults(v_tenant_id);
    select * into v_settings
    from public.tenant_auth_settings
    where tenant_id = v_tenant_id;
  end if;

  if v_channel = 'whatsapp' and not v_settings.allow_whatsapp then
    raise exception 'OTP WhatsApp tidak diizinkan.';
  elsif v_channel = 'email' and not v_settings.allow_email then
    raise exception 'OTP Email tidak diizinkan.';
  elsif v_channel = 'telegram' and not v_settings.allow_telegram then
    raise exception 'OTP Telegram tidak diizinkan.';
  end if;

  select
    nc.provider,
    nc.public_config,
    cred.credentials
  into
    v_provider,
    v_public_config,
    v_credentials
  from public.notification_channels nc
  join private.notification_credentials cred
    on cred.tenant_id = nc.tenant_id
   and cred.channel = nc.channel
   and cred.provider = nc.provider
  where nc.tenant_id = v_tenant_id
    and nc.channel = v_channel
    and nc.is_enabled = true
    and nc.credentials_configured = true
  limit 1;

  if v_provider is null then
    raise exception 'Channel OTP belum terhubung.';
  end if;

  if v_channel = 'email' then
    select u.email into v_target
    from auth.users u
    where u.id = p_user_id;

    v_masked_target := public.mask_auth_email(v_target);
  elsif v_channel = 'whatsapp' then
    select p.phone into v_target
    from public.profiles p
    where p.id = p_user_id;

    v_masked_target := public.mask_auth_phone(v_target);
  else
    select p.telegram_chat_id into v_target
    from public.profiles p
    where p.id = p_user_id;

    v_masked_target := 'Telegram terhubung';
  end if;

  if coalesce(trim(v_target), '') = '' then
    raise exception 'Tujuan OTP untuk channel ini belum tersedia.';
  end if;

  select max(created_at)
  into v_last_created
  from private.auth_otp_challenges
  where user_id = p_user_id
    and channel = v_channel
    and cancelled_at is null;

  if v_last_created is not null
     and v_last_created > now() - make_interval(secs => v_settings.resend_cooldown_seconds)
  then
    raise exception 'Tunggu sebelum meminta OTP baru.';
  end if;

  -- Cancel older unused challenges.
  update private.auth_otp_challenges
  set cancelled_at = now()
  where user_id = p_user_id
    and verified_at is null
    and cancelled_at is null;

  -- Cryptographically random 6 digit OTP using pgcrypto bytes.
  v_random := gen_random_bytes(4);
  v_code_number := (
      get_byte(v_random, 0)::bigint * 16777216
    + get_byte(v_random, 1)::bigint * 65536
    + get_byte(v_random, 2)::bigint * 256
    + get_byte(v_random, 3)::bigint
  );

  v_code := ((v_code_number % 900000) + 100000)::text;

  insert into private.auth_otp_challenges (
    user_id,
    tenant_id,
    channel,
    code_hash,
    expires_at,
    max_attempts
  )
  values (
    p_user_id,
    v_tenant_id,
    v_channel,
    crypt(v_code, gen_salt('bf', 8)),
    now() + make_interval(mins => v_settings.otp_expiry_minutes),
    v_settings.max_attempts
  )
  returning id into v_challenge_id;

  select t.name
  into v_tenant_name
  from public.tenants t
  where t.id = v_tenant_id;

  select nt.subject, nt.body
  into v_template_subject, v_template_body
  from public.notification_templates nt
  where nt.tenant_id = v_tenant_id
    and nt.event_key = 'login_otp'
    and nt.channel = v_channel
    and nt.is_active = true
  limit 1;

  if coalesce(trim(v_template_body), '') = '' then
    v_template_body := 'Kode OTP login {tenant_name}: {otp}. Berlaku {expire_minutes} menit.';
  end if;

  return jsonb_build_object(
    'challenge_id', v_challenge_id,
    'channel', v_channel,
    'provider', v_provider,
    'target', v_target,
    'masked_target', v_masked_target,
    'tenant_name', coalesce(v_tenant_name, 'LondriOne'),
    'code', v_code,
    'expire_minutes', v_settings.otp_expiry_minutes,
    'resend_cooldown_seconds', v_settings.resend_cooldown_seconds,
    'public_config', coalesce(v_public_config, '{}'::jsonb),
    'credentials', coalesce(v_credentials, '{}'::jsonb),
    'template_subject', v_template_subject,
    'template_body', v_template_body
  );
end;
$$;

revoke all on function public.create_auth_otp_challenge(uuid, text)
from public, anon, authenticated;

grant execute on function public.create_auth_otp_challenge(uuid, text)
to service_role;

-- ---------------------------------------------------------
-- 9. Server-only cancel if provider delivery fails
-- ---------------------------------------------------------

create or replace function public.cancel_auth_otp_challenge(
  p_challenge_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = private
as $$
begin
  update private.auth_otp_challenges
  set cancelled_at = now()
  where id = p_challenge_id
    and verified_at is null
    and cancelled_at is null;

  return found;
end;
$$;

revoke all on function public.cancel_auth_otp_challenge(uuid)
from public, anon, authenticated;

grant execute on function public.cancel_auth_otp_challenge(uuid)
to service_role;

-- ---------------------------------------------------------
-- 10. User verifies OTP; current Supabase session is marked
-- ---------------------------------------------------------

create or replace function public.verify_auth_otp_challenge(
  p_challenge_id uuid,
  p_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
declare
  v_user_id uuid;
  v_session_id text;
  v_row private.auth_otp_challenges%rowtype;
begin
  v_user_id := auth.uid();
  v_session_id := coalesce(auth.jwt() ->> 'session_id', '');

  if v_user_id is null or v_session_id = '' then
    raise exception 'Session login tidak valid.';
  end if;

  select *
  into v_row
  from private.auth_otp_challenges
  where id = p_challenge_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'OTP tidak ditemukan.';
  end if;

  if v_row.cancelled_at is not null then
    raise exception 'OTP sudah tidak berlaku.';
  end if;

  if v_row.verified_at is not null then
    return true;
  end if;

  if v_row.expires_at < now() then
    raise exception 'OTP sudah kedaluwarsa.';
  end if;

  if v_row.attempts >= v_row.max_attempts then
    raise exception 'Batas percobaan OTP sudah habis.';
  end if;

  if crypt(trim(coalesce(p_code, '')), v_row.code_hash) <> v_row.code_hash then
    update private.auth_otp_challenges
    set
      attempts = attempts + 1,
      cancelled_at = case
        when attempts + 1 >= max_attempts then now()
        else cancelled_at
      end
    where id = p_challenge_id;

    raise exception 'Kode OTP salah.';
  end if;

  update private.auth_otp_challenges
  set verified_at = now()
  where id = p_challenge_id;

  insert into private.auth_otp_verifications (
    user_id,
    tenant_id,
    session_id,
    verified_at
  )
  values (
    v_user_id,
    v_row.tenant_id,
    v_session_id,
    now()
  )
  on conflict (user_id, session_id)
  do update set
    tenant_id = excluded.tenant_id,
    verified_at = excluded.verified_at;

  return true;
end;
$$;

revoke all on function public.verify_auth_otp_challenge(uuid, text)
from public;

grant execute on function public.verify_auth_otp_challenge(uuid, text)
to authenticated;

commit;
