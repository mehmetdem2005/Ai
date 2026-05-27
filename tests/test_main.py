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
