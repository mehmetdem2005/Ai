-- Sovereign V2 — Güvenlik sertleştirme migrasyonu
-- Uygulama sırası: schema_v2.sql'den SONRA.

-- ────────────────────────────────────────────────────────────
-- Z1: items tablosunu anon'a kapat — sadece authenticated
-- Embedding'ler work product; ayrıca veri dökümü engellenir.
-- Cron pipeline service_role kullanır, RLS bypass'ı zaten var.
-- ────────────────────────────────────────────────────────────
drop policy if exists items_select_all on public.items;
drop policy if exists items_select_authenticated on public.items;
create policy items_select_authenticated on public.items
  for select to authenticated using (true);

-- RPC SECURITY DEFINER — anon kullanıcılar match çağırabilsin diye
-- (RPC'nin kendisi vektör mesafesi döner, embedding dökmez).
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
language sql stable security definer set search_path = public as $$
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
-- Embedding parametresi anon'dan gelmesin diye RPC'yi tetikleyen kullanıcı
-- yine authenticated olmalı (Pro UI dashboard authenticated session ile çağırır).
revoke execute on function public.match_items_for_niche from public, anon;
grant execute on function public.match_items_for_niche to authenticated;
