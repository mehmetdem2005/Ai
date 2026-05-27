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
