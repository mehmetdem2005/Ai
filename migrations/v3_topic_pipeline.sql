-- Sovereign V3 — Topic pipeline hardening
-- Amaç:
--   1. niches.embedding_hash: label+description+pubmed_query md5'i; re-embed tetikleyici.
--   2. Threshold default 0.70 -> 0.72 (text-embedding-3-small medical literature için daha temiz).
--   3. match_items_for_niche_v2: kullanıcının son 7 günde gönderilmiş item'larını eler (gün-aşırı dedup).
-- Idempotent; mevcut RPC ve veriler korunur.

alter table public.niches
    add column if not exists embedding_hash text;

alter table public.niches
    alter column threshold set default 0.72;

create or replace function public.match_items_for_niche_v2(
    p_user_id          uuid,
    p_niche_embedding  vector(1536),
    p_match_threshold  real default 0.72,
    p_match_count      int default 20,
    p_since            timestamptz default (now() - interval '48 hours'),
    p_dedup_window_days int default 7
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
  with recent_seen as (
    select bi.item_id
    from public.brief_items bi
    join public.briefs b on b.id = bi.brief_id
    where b.user_id = p_user_id
      and b.brief_date >= (current_date - p_dedup_window_days)
  )
  select
    i.id, i.source_type, i.title, i.abstract, i.journal, i.url, i.published_at,
    1 - (i.embedding <=> p_niche_embedding) as score
  from public.items i
  where i.embedding is not null
    and i.fetched_at >= p_since
    and 1 - (i.embedding <=> p_niche_embedding) > p_match_threshold
    and i.id not in (select item_id from recent_seen)
  order by i.embedding <=> p_niche_embedding
  limit p_match_count;
$$;

revoke execute on function public.match_items_for_niche_v2 from public, anon;
grant execute on function public.match_items_for_niche_v2 to authenticated, service_role;
