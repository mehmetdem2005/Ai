-- Sovereign Bülten Motoru — Supabase şeması
-- Supabase Dashboard → SQL Editor'da çalıştır (veya Management API ile uygulanır).

create table if not exists public.articles (
    id_hash      text primary key,
    title        text,
    link         text,
    source       text,
    summary      text,
    ai_insight   text,
    embedding    jsonb,
    processed_at timestamptz not null default now()
);

create table if not exists public.newsletters (
    id            bigint generated always as identity primary key,
    filename      text,
    content       text,
    article_count integer,
    created_at    timestamptz not null default now()
);

create index if not exists articles_source_idx on public.articles (source);
create index if not exists articles_processed_at_idx on public.articles (processed_at desc);

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
