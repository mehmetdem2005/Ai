-- Sovereign Admin · 2026 migration
-- Idempotent: tekrar çalıştırılabilir (CREATE TABLE IF NOT EXISTS, ON CONFLICT, OR REPLACE).
--
-- Yeni 7 tablo:
--   admin_users, admin_roles, admin_audit, site_pages, site_strings,
--   cron_runs, worker_logs
--
-- + is_admin() helper
-- + Tüm yeni tablolar için RLS (read for admin, write yalnızca SECURITY DEFINER RPC ile)
-- + Mevcut tablolara additive admin_full_read policy
-- + SECURITY DEFINER mutation RPC'leri (audit_upsert, audit_delete, set_admin_role, vb.)

begin;

-- =========================================================================
-- 1. admin_users — gate
-- =========================================================================

create table if not exists public.admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'viewer'
              check (role in ('superadmin','admin','editor','viewer')),
  active      boolean not null default true,
  granted_by  uuid references auth.users(id),
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  revoked_by  uuid references auth.users(id)
);

create index if not exists admin_users_active_idx
  on public.admin_users(user_id) where active;

-- =========================================================================
-- 2. admin_roles — yetenek matrisi (static seed)
-- =========================================================================

create table if not exists public.admin_roles (
  role          text primary key,
  label         text not null,
  capabilities  text[] not null default '{}'
);

insert into public.admin_roles(role, label, capabilities) values
  ('superadmin', 'Süper Admin', array['*']),
  ('admin',      'Admin',
     array['cms.*','articles.*','feeds.*','users.read','users.write','cron.dispatch','audit.read']),
  ('editor',     'Editör',
     array['cms.write','articles.write','feeds.read','audit.read']),
  ('viewer',     'Görüntüleyici',
     array['cms.read','articles.read','feeds.read','users.read','audit.read'])
on conflict (role) do update
  set label = excluded.label,
      capabilities = excluded.capabilities;

-- =========================================================================
-- 3. admin_audit — değişmez aksiyon kaydı
-- =========================================================================

create table if not exists public.admin_audit (
  id            bigserial primary key,
  actor_id      uuid references auth.users(id),
  actor_email   text,
  op            text not null,
  entity_table  text not null,
  entity_id     text,
  before        jsonb,
  after         jsonb,
  meta          jsonb,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index if not exists admin_audit_created_at_idx
  on public.admin_audit(created_at desc);
create index if not exists admin_audit_entity_idx
  on public.admin_audit(entity_table, entity_id);
create index if not exists admin_audit_actor_idx
  on public.admin_audit(actor_id, created_at desc);

-- =========================================================================
-- 4. site_pages + site_strings — DB-driven CMS
-- =========================================================================

create table if not exists public.site_pages (
  slug        text primary key,
  title       text not null,
  description text,
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now()
);

create table if not exists public.site_strings (
  id          bigserial primary key,
  page_slug   text not null references public.site_pages(slug) on delete cascade,
  key         text not null,
  value       text not null,
  value_md    text,
  lang        text not null default 'tr',
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now(),
  unique (page_slug, key, lang)
);

create index if not exists site_strings_page_lang_idx
  on public.site_strings(page_slug, lang);

-- Seed: bilinen sayfalar
insert into public.site_pages(slug, title, description) values
  ('landing',  'Anasayfa',  'sovereign-roan.vercel.app/'),
  ('hakkinda', 'Hakkında',  'sovereign-roan.vercel.app/hakkinda'),
  ('abonelik', 'Abonelik',  'sovereign-roan.vercel.app/abonelik'),
  ('nav',      'Navigasyon ve global metinler', 'Header/footer/menü etiketleri')
on conflict (slug) do nothing;

-- =========================================================================
-- 5. cron_runs + worker_logs — pipeline gözlemlenebilirliği
-- =========================================================================

create table if not exists public.cron_runs (
  id              bigserial primary key,
  workflow        text not null,
  github_run_id   bigint unique,
  status          text not null default 'queued'
                  check (status in ('queued','in_progress','success','failure','cancelled','timeout')),
  triggered_by    uuid references auth.users(id),
  trigger_source  text default 'schedule'
                  check (trigger_source in ('schedule','manual','push','webhook')),
  started_at      timestamptz,
  finished_at     timestamptz,
  inputs          jsonb,
  summary         jsonb,
  error           text,
  created_at      timestamptz not null default now()
);

create index if not exists cron_runs_workflow_idx
  on public.cron_runs(workflow, created_at desc);
create index if not exists cron_runs_status_idx
  on public.cron_runs(status, created_at desc);

create table if not exists public.worker_logs (
  id          bigserial primary key,
  run_id      bigint references public.cron_runs(id) on delete cascade,
  level       text not null check (level in ('debug','info','warn','error')),
  message     text not null,
  context     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists worker_logs_run_idx
  on public.worker_logs(run_id, created_at);

-- =========================================================================
-- 6. is_admin() — paylaşılan gate helper
-- =========================================================================

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and active = true
  );
$$;

create or replace function public.admin_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from public.admin_users
  where user_id = auth.uid() and active = true
  limit 1;
$$;

create or replace function public.has_capability(p_cap text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.admin_users au
    join public.admin_roles ar on ar.role = au.role
    where au.user_id = auth.uid()
      and au.active = true
      and (
        '*' = any(ar.capabilities)
        or p_cap = any(ar.capabilities)
        or (split_part(p_cap, '.', 1) || '.*') = any(ar.capabilities)
      )
  );
$$;

-- =========================================================================
-- 7. RLS — yeni tablolar (read=admin, write=DENY)
-- =========================================================================

-- admin_users
alter table public.admin_users enable row level security;
drop policy if exists admin_users_read on public.admin_users;
create policy admin_users_read on public.admin_users
  for select using (public.is_admin());
drop policy if exists admin_users_write on public.admin_users;
create policy admin_users_write on public.admin_users
  for all using (false) with check (false);

-- admin_roles
alter table public.admin_roles enable row level security;
drop policy if exists admin_roles_read on public.admin_roles;
create policy admin_roles_read on public.admin_roles
  for select using (public.is_admin());
drop policy if exists admin_roles_write on public.admin_roles;
create policy admin_roles_write on public.admin_roles
  for all using (false) with check (false);

-- admin_audit
alter table public.admin_audit enable row level security;
drop policy if exists admin_audit_read on public.admin_audit;
create policy admin_audit_read on public.admin_audit
  for select using (public.is_admin());
drop policy if exists admin_audit_write on public.admin_audit;
create policy admin_audit_write on public.admin_audit
  for all using (false) with check (false);

-- site_pages
alter table public.site_pages enable row level security;
drop policy if exists site_pages_read on public.site_pages;
create policy site_pages_read on public.site_pages
  for select using (true);  -- public okunabilir; landing kendisi çekecek
drop policy if exists site_pages_write on public.site_pages;
create policy site_pages_write on public.site_pages
  for all using (false) with check (false);

-- site_strings
alter table public.site_strings enable row level security;
drop policy if exists site_strings_read on public.site_strings;
create policy site_strings_read on public.site_strings
  for select using (true);  -- public okunabilir
drop policy if exists site_strings_write on public.site_strings;
create policy site_strings_write on public.site_strings
  for all using (false) with check (false);

-- cron_runs
alter table public.cron_runs enable row level security;
drop policy if exists cron_runs_read on public.cron_runs;
create policy cron_runs_read on public.cron_runs
  for select using (public.is_admin());
drop policy if exists cron_runs_write on public.cron_runs;
create policy cron_runs_write on public.cron_runs
  for all using (false) with check (false);

-- worker_logs
alter table public.worker_logs enable row level security;
drop policy if exists worker_logs_read on public.worker_logs;
create policy worker_logs_read on public.worker_logs
  for select using (public.is_admin());
drop policy if exists worker_logs_write on public.worker_logs;
create policy worker_logs_write on public.worker_logs
  for all using (false) with check (false);

-- Mevcut tablolara additive admin read policy
do $$
declare t text;
begin
  for t in select unnest(array['articles','newsletters','long_reads','feeds',
                               'profiles','niches','items','briefs','brief_items'])
  loop
    if exists (select 1 from pg_tables where schemaname='public' and tablename=t) then
      execute format('drop policy if exists admin_full_read on public.%I;', t);
      execute format('create policy admin_full_read on public.%I for select using (public.is_admin());', t);
    end if;
  end loop;
end$$;

-- =========================================================================
-- 8. SECURITY DEFINER mutation RPC'leri
--    Frontend bunları çağırır; doğrudan DML RLS ile yasak.
--    Her başarılı mutation admin_audit'e bir satır yazar.
-- =========================================================================

-- Generic upsert (jsonb satır, primary key kolonu)
create or replace function public.admin_upsert(
  p_table text,
  p_row   jsonb,
  p_key   text
) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_cap       text := split_part(p_table, '_', 1) || '.write';
  v_before    jsonb;
  v_after     jsonb;
  v_id        text;
  v_user_id   uuid := auth.uid();
  v_email     text;
  v_allowed   text[] := array['site_pages','site_strings','feeds'];
begin
  if not public.has_capability(v_cap) and not public.has_capability(p_table || '.write') then
    raise exception 'forbidden: missing capability % or %.write', v_cap, p_table;
  end if;
  if not (p_table = any(v_allowed)) then
    raise exception 'admin_upsert: % whitelist''te değil', p_table;
  end if;

  v_id := p_row ->> p_key;
  execute format('select to_jsonb(t) from public.%I t where %I = $1', p_table, p_key)
    into v_before using v_id;

  execute format(
    'insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)
     on conflict (%I) do update set %s
     returning to_jsonb(public.%I.*)',
    p_table, p_table, p_key,
    (select string_agg(format('%I = excluded.%I', column_name, column_name), ', ')
     from information_schema.columns
     where table_schema='public' and table_name=p_table
       and column_name != p_key),
    p_table
  ) into v_after using p_row;

  select email into v_email from auth.users where id = v_user_id;
  insert into public.admin_audit(actor_id, actor_email, op, entity_table, entity_id, before, after)
  values (v_user_id, v_email,
          case when v_before is null then 'insert' else 'update' end,
          p_table, v_id, v_before, v_after);

  return v_after;
end$$;

create or replace function public.admin_delete(
  p_table text,
  p_key   text,
  p_id    text
) returns boolean
  language plpgsql security definer set search_path = public as $$
declare
  v_cap     text := split_part(p_table, '_', 1) || '.write';
  v_before  jsonb;
  v_user_id uuid := auth.uid();
  v_email   text;
  v_allowed text[] := array['site_strings','feeds'];
begin
  if not public.has_capability(v_cap) and not public.has_capability(p_table || '.write') then
    raise exception 'forbidden';
  end if;
  if not (p_table = any(v_allowed)) then
    raise exception 'admin_delete: % whitelist''te değil', p_table;
  end if;

  execute format('select to_jsonb(t) from public.%I t where %I = $1', p_table, p_key)
    into v_before using p_id;
  if v_before is null then
    return false;
  end if;

  execute format('delete from public.%I where %I = $1', p_table, p_key) using p_id;

  select email into v_email from auth.users where id = v_user_id;
  insert into public.admin_audit(actor_id, actor_email, op, entity_table, entity_id, before)
  values (v_user_id, v_email, 'delete', p_table, p_id, v_before);

  return true;
end$$;

-- Article status değiştir (whitelist + audit)
create or replace function public.set_article_status(
  p_id_hash text,
  p_status  text
) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_before  jsonb;
  v_after   jsonb;
  v_email   text;
begin
  if not public.has_capability('articles.write') then
    raise exception 'forbidden';
  end if;
  if not (p_status = any(array['pending','published','rejected'])) then
    raise exception 'invalid status: %', p_status;
  end if;

  select to_jsonb(a.*) into v_before from public.articles a where id_hash = p_id_hash;
  if v_before is null then raise exception 'article not found'; end if;

  update public.articles set status = p_status where id_hash = p_id_hash
    returning to_jsonb(public.articles.*) into v_after;

  select email into v_email from auth.users where id = auth.uid();
  insert into public.admin_audit(actor_id, actor_email, op, entity_table, entity_id, before, after, meta)
  values (auth.uid(), v_email, 'article.status_change', 'articles', p_id_hash,
          v_before, v_after, jsonb_build_object('new_status', p_status));

  return v_after;
end$$;

-- Admin rol ata/değiştir (sadece superadmin)
create or replace function public.set_admin_role(
  p_user_id uuid,
  p_role    text,
  p_active  boolean default true
) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_caller  uuid := auth.uid();
  v_email   text;
  v_before  jsonb;
  v_after   jsonb;
begin
  if public.admin_role() <> 'superadmin' then
    raise exception 'forbidden: superadmin gerekli';
  end if;
  if not (p_role = any(array['superadmin','admin','editor','viewer'])) then
    raise exception 'invalid role: %', p_role;
  end if;
  if p_user_id = v_caller and (p_role <> 'superadmin' or p_active = false) then
    raise exception 'kendi rolünü düşüremezsin';
  end if;

  select to_jsonb(au.*) into v_before from public.admin_users au where user_id = p_user_id;

  insert into public.admin_users(user_id, role, active, granted_by, granted_at)
  values (p_user_id, p_role, p_active, v_caller, now())
  on conflict (user_id) do update
    set role = excluded.role,
        active = excluded.active,
        granted_by = v_caller,
        granted_at = now(),
        revoked_at = case when excluded.active = false then now() else null end,
        revoked_by = case when excluded.active = false then v_caller else null end
  returning to_jsonb(public.admin_users.*) into v_after;

  select email into v_email from auth.users where id = v_caller;
  insert into public.admin_audit(actor_id, actor_email, op, entity_table, entity_id, before, after,
                                  meta)
  values (v_caller, v_email, 'iam.role_change', 'admin_users', p_user_id::text,
          v_before, v_after, jsonb_build_object('new_role', p_role, 'active', p_active));

  return v_after;
end$$;

-- Cron run kaydet (workflow_dispatch'tan callback)
create or replace function public.record_cron_run(p_payload jsonb) returns bigint
  language plpgsql security definer set search_path = public as $$
declare
  v_id        bigint;
  v_github_id bigint := (p_payload ->> 'github_run_id')::bigint;
begin
  if not public.is_admin() and current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'forbidden';
  end if;

  insert into public.cron_runs(workflow, github_run_id, status, trigger_source,
                                triggered_by, started_at, finished_at, inputs, summary, error)
  values (
    p_payload ->> 'workflow',
    v_github_id,
    coalesce(p_payload ->> 'status', 'queued'),
    coalesce(p_payload ->> 'trigger_source', 'schedule'),
    (p_payload ->> 'triggered_by')::uuid,
    (p_payload ->> 'started_at')::timestamptz,
    (p_payload ->> 'finished_at')::timestamptz,
    p_payload -> 'inputs',
    p_payload -> 'summary',
    p_payload ->> 'error'
  )
  on conflict (github_run_id) do update
    set status      = excluded.status,
        finished_at = excluded.finished_at,
        summary     = excluded.summary,
        error       = excluded.error
  returning id into v_id;

  return v_id;
end$$;

-- =========================================================================
-- 9. Seed ilk superadmin — mehmetdem7878@gmail.com
--    (auth.users'da bu e-posta varsa ve admin_users'da yoksa ekle)
-- =========================================================================

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users
   where email in ('mehmetdem782100@gmail.com', 'mehmetdem7878@gmail.com')
   order by created_at desc
   limit 1;
  if v_user_id is not null then
    insert into public.admin_users(user_id, role, active, granted_at)
    values (v_user_id, 'superadmin', true, now())
    on conflict (user_id) do update
      set role = 'superadmin', active = true;
  end if;
end$$;

commit;

-- =========================================================================
-- Doğrulama sorguları (migration sonrası manuel çalıştır)
-- =========================================================================
-- select count(*) from public.admin_roles;            -- 4 olmalı
-- select * from public.admin_users;                   -- superadmin satırı olmalı
-- select public.is_admin();                           -- auth.uid() varsa true
-- select public.has_capability('articles.write');     -- true (admin/editor için)
