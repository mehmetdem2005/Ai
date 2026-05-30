-- Sovereign V2 — Kişiselleştirilmiş Literatür Gözetim Şeması
-- Additive: eski tabloları (articles, newsletters, feeds) bozmaz.
-- Supabase SQL Editor'da çalıştır.

-- pgvector — embedding'ler için
create extension if not exists vector;

-- ────────────────────────────────────────────────────────────
-- 1. profiles — auth.users'ı zenginleştirir
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    email       text,
    full_name   text,
    specialty   text,  -- oncology | cardiology | radiology | icu | pathology | epi | ai_research | other
    plan        text not null default 'free',  -- free | pro
    timezone    text not null default 'Europe/Istanbul',
    locale      text not null default 'tr',
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- Yeni signup'ta otomatik profil oluştur
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. niches — kullanıcının takip ettiği konular
-- ────────────────────────────────────────────────────────────
create table if not exists public.niches (
    id          bigint generated always as identity primary key,
    user_id     uuid not null references public.profiles(id) on delete cascade,
    label       text not null,                -- "HER2+ metastatik meme · ADC'ler"
    description text not null,                -- serbest metin tanım (embedding'in girdisi)
    pubmed_query text,                        -- opsiyonel: ham PubMed E-utilities sorgusu (MeSH dahil)
    embedding   vector(1536),                 -- OpenAI text-embedding-3-small
    threshold   real not null default 0.70,   -- cosine similarity eşiği
    is_active   boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists niches_user_idx on public.niches (user_id) where is_active = true;

-- ────────────────────────────────────────────────────────────
-- 3. items — tüm kaynaklardan deduplike makale/içerik deposu
-- ────────────────────────────────────────────────────────────
create table if not exists public.items (
    id           bigint generated always as identity primary key,
    source_type  text not null,           -- pubmed | medrxiv | biorxiv | arxiv | clinicaltrials | openfda | rss
    source_id    text not null,           -- PMID, DOI, NCT-id, arXiv-id
    doi          text,
    title        text not null,
    abstract     text,
    authors      jsonb,                   -- ["Smith J", "Doe A", ...]
    journal      text,
    published_at timestamptz,
    url          text,
    raw          jsonb,                   -- ham orijinal metadata
    embedding    vector(1536),
    fetched_at   timestamptz not null default now(),
    constraint items_unique_source unique (source_type, source_id)
);

create index if not exists items_published_idx on public.items (published_at desc);
create index if not exists items_source_idx on public.items (source_type, fetched_at desc);
-- Vektör arama indeksi — yaklaşık en yakın komşu (HNSW)
create index if not exists items_embedding_idx on public.items
  using hnsw (embedding vector_cosine_ops);

-- ────────────────────────────────────────────────────────────
-- 4. briefs — kullanıcı başına günlük brief
-- ────────────────────────────────────────────────────────────
create table if not exists public.briefs (
    id            bigint generated always as identity primary key,
    user_id       uuid not null references public.profiles(id) on delete cascade,
    brief_date    date not null,
    status        text not null default 'draft',  -- draft | delivered | read
    delivered_at  timestamptz,
    item_count    int not null default 0,
    created_at    timestamptz not null default now(),
    constraint briefs_user_date unique (user_id, brief_date)
);

create index if not exists briefs_user_date_idx on public.briefs (user_id, brief_date desc);

-- ────────────────────────────────────────────────────────────
-- 5. brief_items — brief içindeki makaleler (niş bağlamıyla)
-- ────────────────────────────────────────────────────────────
create table if not exists public.brief_items (
    brief_id   bigint not null references public.briefs(id) on delete cascade,
    item_id    bigint not null references public.items(id) on delete cascade,
    niche_id   bigint not null references public.niches(id) on delete cascade,
    score      real not null,             -- cosine similarity
    summary_tr text,                       -- LLM özet, Türkçe
    position   int not null default 0,
    primary key (brief_id, item_id, niche_id)
);

create index if not exists brief_items_brief_idx on public.brief_items (brief_id, position);

-- ────────────────────────────────────────────────────────────
-- 6. RLS — kullanıcılar sadece kendi verilerini görür
-- ────────────────────────────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.niches      enable row level security;
alter table public.briefs      enable row level security;
alter table public.brief_items enable row level security;
-- items tablosu paylaşımlı havuz (read-all, sadece servis yazabilir)
alter table public.items       enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);

-- niches
drop policy if exists niches_all_own on public.niches;
create policy niches_all_own on public.niches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- briefs
drop policy if exists briefs_select_own on public.briefs;
create policy briefs_select_own on public.briefs for select using (auth.uid() = user_id);

-- brief_items (brief sahibine bağlı)
drop policy if exists brief_items_select_own on public.brief_items;
create policy brief_items_select_own on public.brief_items for select using (
  exists (select 1 from public.briefs b where b.id = brief_items.brief_id and b.user_id = auth.uid())
);

-- items — okuma herkese açık (anonim+auth) ama sadece service_role yazabilir
drop policy if exists items_select_all on public.items;
create policy items_select_all on public.items for select using (true);

-- ────────────────────────────────────────────────────────────
-- 7. RPC — vektör arama (niş için top-k yeni item)
-- ────────────────────────────────────────────────────────────
create or replace function public.match_items_for_niche(
    niche_embedding vector(1536),
    match_threshold real default 0.70,
    match_count int default 20,
    since timestamptz default (now() - interval '48 hours')
)
returns table (
    id           bigint,
    source_type  text,
    title        text,
    abstract     text,
    journal      text,
    url          text,
    published_at timestamptz,
    score        real
)
language sql stable as $$
  select
    i.id, i.source_type, i.title, i.abstract, i.journal, i.url, i.published_at,
    1 - (i.embedding <=> niche_embedding) as score
  from public.items i
  where i.embedding is not null
    and i.fetched_at >= since
    and 1 - (i.embedding <=> niche_embedding) > match_threshold
  order by i.embedding <=> niche_embedding
  limit match_count;
$$;
