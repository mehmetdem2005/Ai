"""Ağ/anahtar gerektirmeyen birim testleri (presubmit'te çalışır)."""
import main


def test_cosine_identical():
    assert round(main.cosine_similarity([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]), 6) == 1.0


def test_cosine_orthogonal():
    assert main.cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0


def test_cosine_dim_mismatch_returns_zero():
    # Farklı boyut (farklı embedding modeli) sessizce kırpılmamalı.
    assert main.cosine_similarity([1.0, 2.0, 3.0], [1.0, 2.0]) == 0.0


def test_cosine_zero_vector():
    assert main.cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0


def test_load_feeds_returns_nonempty_list(monkeypatch):
    # Supabase'i devre dışı bırak → feeds.json/varsayılan yolunu hermetik test et.
    monkeypatch.setattr(main, "_feeds_from_supabase", lambda: None)
    feeds = main.load_feeds()
    assert isinstance(feeds, list) and feeds
    assert all("name" in f and "url" in f for f in feeds)


def test_now_ist_is_timezone_aware():
    dt = main.now_ist()
    assert dt.tzinfo is not None
    assert main.TR_MONTHS[dt.month]  # Türkçe ay adı var


def test_publisher_render_contains_title_and_link():
    items = [{"title": "Test Başlık", "link": "https://e.com/x", "source": "Kaynak", "ai_insight": "içgörü"}]
    md = main.Publisher().render(items)
    assert "Test Başlık" in md
    assert "https://e.com/x" in md
    assert "içgörü" in md
    # Skor yoksa "Sinyal Gücü" satırı görünmemeli.
    assert "Sinyal Gücü" not in md


def test_publisher_render_shows_impact_score():
    items = [{
        "title": "T", "title_tr": "Başlık", "link": "https://e.com/y",
        "source": "Nature", "ai_insight": "analiz", "impact_score": 8,
    }]
    md = main.Publisher().render(items)
    assert "Sinyal Gücü" in md
    assert "8/10" in md
    assert "Başlık" in md  # Türkçe başlık kullanıldı


# ---- V2: AI skorlama / JSON çözümleme ----

def test_parse_analysis_valid():
    raw = '{"score": 9, "title_tr": "Yapay Zeka Atılımı", "insight": "Önemli bir gelişme."}'
    out = main.AIProcessor._parse_analysis(raw, "fallback")
    assert out == {"score": 9, "title_tr": "Yapay Zeka Atılımı", "insight": "Önemli bir gelişme."}


def test_parse_analysis_strips_fence_and_extra_text():
    raw = 'İşte sonuç:\n```json\n{"score": 7, "title_tr": "X", "insight": "Y"}\n```\nUmarım yardımcı olur.'
    out = main.AIProcessor._parse_analysis(raw, "fallback")
    assert out["score"] == 7
    assert out["insight"] == "Y"


def test_parse_analysis_clamps_and_rounds_score():
    assert main.AIProcessor._parse_analysis('{"score": 15, "insight": "z"}', "fb")["score"] == 10
    assert main.AIProcessor._parse_analysis('{"score": 0, "insight": "z"}', "fb")["score"] == 1
    assert main.AIProcessor._parse_analysis('{"score": 8.6, "insight": "z"}', "fb")["score"] == 9


def test_parse_analysis_fallback_title_when_missing():
    out = main.AIProcessor._parse_analysis('{"score": 6, "insight": "z"}', "Orijinal Başlık")
    assert out["title_tr"] == "Orijinal Başlık"


def test_parse_analysis_invalid_returns_none():
    assert main.AIProcessor._parse_analysis("düz metin, JSON yok", "fb") is None
    assert main.AIProcessor._parse_analysis('{"score": "yok", "insight": "z"}', "fb") is None
    assert main.AIProcessor._parse_analysis('{"score": 8}', "fb") is None  # insight eksik
    assert main.AIProcessor._parse_analysis('{bozuk json', "fb") is None


# ---- V2: kaynak kotası ----

def test_apply_source_quota_caps_per_source():
    items = [
        {"source": "Fierce", "title": "1"}, {"source": "Fierce", "title": "2"},
        {"source": "Fierce", "title": "3"}, {"source": "Nature", "title": "4"},
    ]
    out = main.apply_source_quota(items, limit=2)
    assert len(out) == 3  # Fierce'tan 2, Nature'dan 1
    assert [i["title"] for i in out] == ["1", "2", "4"]  # sıra korunur


def test_apply_source_quota_zero_limit_passthrough():
    items = [{"source": "A"}, {"source": "A"}]
    assert main.apply_source_quota(items, limit=0) == items


# ---- V2: yayın seçimi (skor eşiği + sıralama + top-N) ----

def test_select_for_publication_filters_sorts_and_caps():
    items = [
        {"title": "a", "impact_score": 6},   # eşik altı → elenir
        {"title": "b", "impact_score": 9},
        {"title": "c", "impact_score": 7},
        {"title": "d", "impact_score": 10},
        {"title": "e", "impact_score": 8},
        {"title": "f", "impact_score": 7},   # top-5 sınırının dışında kalır
    ]
    out = main.select_for_publication(items, min_score=7, limit=5)
    assert [i["title"] for i in out] == ["d", "b", "e", "c", "f"]
    assert len(out) == 5


def test_select_for_publication_handles_missing_scores():
    items = [{"title": "a"}, {"title": "b", "impact_score": 8}]
    out = main.select_for_publication(items, min_score=7, limit=5)
    assert [i["title"] for i in out] == ["b"]


def test_deduper_drops_near_duplicate(monkeypatch):
    d = main.SemanticDeduper()
    d.is_active = True
    d.threshold = 0.9
    # İlk iki vektör neredeyse aynı; üçüncü farklı.
    monkeypatch.setattr(d, "_embed", lambda texts: [[1.0, 0.0], [0.99, 0.01], [0.0, 1.0]])
    items = [
        {"title": "a", "summary": "x"},
        {"title": "b", "summary": "y"},  # a'nın yakın-tekrarı
        {"title": "c", "summary": "z"},
    ]
    kept, dropped = d.deduplicate(items, history_vectors=[])
    assert len(kept) == 2
    assert len(dropped) == 1
    assert all("embedding" in k for k in kept)


def test_deduper_inactive_passthrough():
    d = main.SemanticDeduper()
    d.is_active = False
    items = [{"title": "a", "summary": "x"}]
    kept, dropped = d.deduplicate(items, history_vectors=[])
    assert kept == items
    assert dropped == []
