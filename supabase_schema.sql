-- Sovereign Bülten Motoru — Supabase şeması
-- Supabase Dashboard → SQL Editor'da çalıştır (veya Management API ile uygulanır).

create table if not exists public.articles (
    id_hash      text primary key,
    title        text,
    title_tr     text,
    link         text,
    source       text,
    summary      text,
    ai_insight   text,
    impact_score numeric,
    category     text,
    status       text not null default 'pending',
    embedding    jsonb,
    processed_at timestamptz not null default now()
);

-- Mevcut kurulumlar için migration (tablo zaten varsa eksik sütunları ekle).
alter table public.articles add column if not exists impact_score numeric;
alter table public.articles add column if not exists title_tr text;
alter table public.articles add column if not exists category text;
-- V3 status: önce NULL olarak ekle, mevcut satırları 'published' yap, sonra default+NOT NULL.
alter table public.articles add column if not exists status text;
update public.articles set status = 'published' where status is null;
alter table public.articles alter column status set default 'pending';
alter table public.articles alter column status set not null;

create table if not exists public.newsletters (
    id            bigint generated always as identity primary key,
    filename      text,
    content       text,
    article_count integer,
    social_posts  jsonb,
    created_at    timestamptz not null default now()
);

-- V3 migration: mevcut newsletters tablosuna sosyal post sütununu ekle.
alter table public.newsletters add column if not exists social_posts jsonb;

create index if not exists articles_source_idx on public.articles (source);
create index if not exists articles_processed_at_idx on public.articles (processed_at desc);
-- Çeyreklik "en yüksek puanlı haberler" raporları için.
create index if not exists articles_impact_score_idx on public.articles (impact_score desc);
-- V3 — Streamlit kokpiti get_pending_items hızlı çalışsın.
create index if not exists articles_status_idx on public.articles (status);

-- Kaynaklar (RSS feed'leri) — web yönetim arayüzünden eklenir; pipeline buradan okur.
create table if not exists public.feeds (
    id         bigint generated always as identity primary key,
    name       text not null,
    url        text not null unique,
    active     boolean not null default true,
    created_at timestamptz not null default now()
);

-- Güvenlik: RLS aç. Sunucu service_role key kullandığı için RLS'i baypas eder ve
-- çalışmaya devam eder; politika tanımlanmadığı için anon/public erişim reddedilir.
alter table public.articles enable row level security;
alter table public.newsletters enable row level security;
alter table public.feeds enable row level security;
