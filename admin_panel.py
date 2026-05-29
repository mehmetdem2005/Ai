"""Sovereign BioTech V3 — Editöryal Onay Kokpiti (Streamlit).

HITL (Human-in-the-Loop) paneli:
  - Onay bekleyen makaleleri kategoriye göre gruplayıp gösterir.
  - Per-item: rejecte/insight düzenleme.
  - "Yayınla" → Beehiiv (draft) + Supabase newsletters + sosyal post.
  - Auto-publish emniyet sübabının ne zaman tetikleneceğini yan panelde gösterir.

Çalıştır:
  streamlit run admin_panel.py --server.port 8501 --server.address 0.0.0.0
"""
import logging
import os
from collections import defaultdict

import streamlit as st
from dotenv import load_dotenv

load_dotenv()

import main as engine  # noqa: E402  (load_dotenv'den sonra import zorunlu)
import publish_workflow  # noqa: E402

logger = logging.getLogger("AdminPanel")

st.set_page_config(
    page_title="Sovereign Kokpit", page_icon="🧬", layout="wide"
)


def _require_login() -> None:
    pw_env = os.getenv("ADMIN_PASSWORD")
    if not pw_env:
        st.error(
            "⚠️ `ADMIN_PASSWORD` ortam değişkeni tanımlı değil — panel erişime kapalı. "
            ".env dosyasına ekleyip yeniden başlat."
        )
        st.stop()
    if st.session_state.get("authed"):
        return
    st.title("🔐 Sovereign Kokpit — Giriş")
    pw = st.text_input("Şifre", type="password")
    if pw:
        if pw == pw_env:
            st.session_state["authed"] = True
            st.rerun()
        else:
            st.error("Yanlış şifre.")
    st.stop()


_require_login()

st.title("🧬 Sovereign BioTech — Editöryal Kokpit")
st.caption("Onay bekleyen makaleleri incele, gerekirse reddet/düzenle ve bülteni yayınla.")

store = engine.SupabaseStore()
publisher = engine.Publisher()

if not store.is_active:
    st.error("Supabase bağlı değil (SUPABASE_URL/SUPABASE_KEY eksik).")
    st.stop()

# === Yan panel: durum ve auto-publish geri sayım ===
with st.sidebar:
    st.header("Durum")
    age = store.oldest_pending_age_hours()
    auto_hours = engine._env_float("AUTO_PUBLISH_AFTER_HOURS", 24)
    if age is None:
        st.info("Pending haber yok.")
    else:
        st.metric("En eski pending", f"{age:.1f} saat")
        if auto_hours > 0:
            remaining = auto_hours - age
            if remaining > 0:
                st.metric("Otomatik yayına kalan", f"{remaining:.1f} saat")
            else:
                st.warning(
                    "⏰ Sıradaki worker tikinde otomatik yayınlanacak — "
                    "onaylamak istersen şimdi 'Yayınla'ya bas."
                )
        else:
            st.caption("Otomasyon kapalı (AUTO_PUBLISH_AFTER_HOURS=0)")

    st.divider()
    if st.button("🔄 Yenile"):
        st.rerun()
    if st.button("Çıkış"):
        st.session_state.clear()
        st.rerun()

# === Pending listele ===
pending = store.get_pending_items()
st.subheader(f"Onay Bekleyen Makaleler ({len(pending)})")

if not pending:
    st.info("Şu an pending bekleyen haber yok. Worker bir sonraki tikte yeni haberler eklerse burada görünür.")
    st.stop()

# Reddedilenler ve düzenlenmiş insight'lar session state'te
st.session_state.setdefault("rejected_hashes", set())
st.session_state.setdefault("edited_insights", {})

# Kategoriye göre grupla
grouped: dict[str, list[dict]] = defaultdict(list)
for item in pending:
    grouped[item.get("category") or "Genel"].append(item)

for category in sorted(grouped.keys()):
    st.markdown(f"### 📁 {category}  ·  *{len(grouped[category])} haber*")
    for item in grouped[category]:
        h = item["id_hash"]
        is_rejected = h in st.session_state["rejected_hashes"]
        with st.container(border=True):
            cols = st.columns([6, 1])
            with cols[0]:
                heading = item.get("title_tr") or item.get("title") or "(başlıksız)"
                if is_rejected:
                    st.markdown(f"~~**{heading}**~~ 🚫 *(Reddedildi)*")
                else:
                    st.markdown(f"**{heading}**")
                score = item.get("impact_score")
                meta_bits = [f"📰 {item.get('source', '?')}"]
                if score is not None:
                    meta_bits.append(f"📊 Sinyal: **{int(score)}/10**")
                meta_bits.append(f"[Kaynak]({item.get('link')})")
                st.caption("  ·  ".join(meta_bits))
                edited = st.text_area(
                    "Analist Sinyali (düzenlenebilir)",
                    value=st.session_state["edited_insights"].get(
                        h, item.get("ai_insight") or ""
                    ),
                    key=f"insight_{h}",
                    height=110,
                    disabled=is_rejected,
                )
                if not is_rejected and edited != (item.get("ai_insight") or ""):
                    st.session_state["edited_insights"][h] = edited
            with cols[1]:
                if is_rejected:
                    if st.button("↩️ Geri Al", key=f"unr_{h}"):
                        st.session_state["rejected_hashes"].discard(h)
                        st.rerun()
                else:
                    if st.button("🚫 Reddet", key=f"rej_{h}"):
                        st.session_state["rejected_hashes"].add(h)
                        st.rerun()

# === Yayın ===
st.divider()
keep_items = [i for i in pending if i["id_hash"] not in st.session_state["rejected_hashes"]]
rejected_count = len(st.session_state["rejected_hashes"])
st.markdown(
    f"**Yayına gidecek:** {len(keep_items)} haber  ·  **Reddedilen:** {rejected_count}"
)

if "publish_result" not in st.session_state:
    st.session_state["publish_result"] = None

if st.button(
    "🚀 Bülteni Yayınla (Beehiiv + Site)",
    type="primary",
    disabled=len(keep_items) == 0,
):
    with st.spinner("Yayınlanıyor... (Beehiiv + Supabase + sosyal post)"):
        # Reddedilenleri DB'de 'rejected' işaretle
        rejected = list(st.session_state["rejected_hashes"])
        if rejected:
            store.update_articles_status(rejected, "rejected")

        # In-memory items hazırla (düzenlenmiş insight'ları uygula)
        to_publish = []
        for r in keep_items:
            h = r["id_hash"]
            to_publish.append(
                {
                    "hash": h,
                    "title": r["title"],
                    "title_tr": r.get("title_tr"),
                    "link": r["link"],
                    "source": r["source"],
                    "ai_insight": st.session_state["edited_insights"].get(
                        h, r.get("ai_insight")
                    ),
                    "impact_score": r.get("impact_score"),
                    "category": r.get("category"),
                }
            )

        result = publish_workflow.publish_newsletter(
            to_publish, store, publisher, trigger="manual"
        )
        st.session_state["publish_result"] = result
        # Sonraki render'da temiz başlasın
        st.session_state["rejected_hashes"] = set()
        st.session_state["edited_insights"] = {}
    st.rerun()

# Yayın sonrası özet
if st.session_state.get("publish_result"):
    result = st.session_state["publish_result"]
    st.success(
        f"✅ Yayınlandı: **{result['count']} haber**. "
        f"Beehiiv: {'✓ draft oluşturuldu' if result.get('beehiiv') else '⚠️ atlandı (anahtar yok ya da hata)'}"
    )

    social = result.get("social_posts") or {}
    posts = social.get("posts") or []
    st.subheader("📣 Sosyal Medya İçeriği (LLM otonom strateji)")
    if note := social.get("strategy_note"):
        st.caption(f"💡 *{note}*")
    if not posts:
        st.info("Sosyal post üretilmedi (anahtar yok veya LLM hata verdi).")
    for p in posts:
        with st.container(border=True):
            platform = p.get("platform", "?").title()
            kind = p.get("kind", "post")
            st.markdown(f"**{platform}** — `{kind}`")
            st.code(p.get("content", ""), language="text")

    with st.expander("📄 Markdown önizleme"):
        st.markdown(result.get("markdown", ""))

    if st.button("Bu özeti kapat"):
        st.session_state["publish_result"] = None
        st.rerun()
