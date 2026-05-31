-- Sovereign V3.2 — rerank-aware threshold recalibrate
-- v3.6'da LLM rerank devreye girdi. Embedding'in işi artık FILTER değil,
-- "kaba candidate havuzu" oluşturmak. LLM gerçek alaka filtresini yapıyor.
-- Threshold 0.55 çok sıkı: dar tanımlı nişler (örn. "STK11 KEAP1 MHC kaybı")
-- için niş alakalı item'lar 0.48-0.52 bandında kalıyor, LLM'e ulaşmıyor.
-- 0.45'e indirilince: embedding pool genişler, rerank temizler, recall artar.

alter table public.niches
    alter column threshold set default 0.45;

update public.niches
    set threshold = 0.45
    where threshold > 0.45;
