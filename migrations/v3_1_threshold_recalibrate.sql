-- Sovereign V3.1 — threshold kalibre
-- v3'te 0.72'ye çıkarmıştım; gerçek brief skorları 0.50-0.58 bandında geldiği için
-- threshold default'unu 0.55'e çekiyorum. top_k=5 zaten sıkı niş-başı limit;
-- threshold'un işi sadece "açıkça konu dışı" item'ları elemek.
-- Mevcut iki nişin değerini de 0.55'e set ediyorum.

alter table public.niches
    alter column threshold set default 0.55;

update public.niches
    set threshold = 0.55
    where threshold is null or threshold > 0.60;
