"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PendingItem, PublishItem, PublishResult } from "@/lib/types";

type Props = {
  pending: PendingItem[];
  oldestAgeHours: number | null;
  autoHours: number;
  userEmail: string;
};

export default function PanelClient({ pending, oldestAgeHours, autoHours, userEmail }: Props) {
  const router = useRouter();
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [cronState, setCronState] = useState<"loading" | "active" | "disabled_manually" | "unknown">("loading");
  const [triggering, setTriggering] = useState(false);
  const [cronToggling, setCronToggling] = useState(false);
  const [opMsg, setOpMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Cron durumunu yükle (sayfa açılışında)
  useEffect(() => {
    fetch("/api/workflow")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.state === "string") setCronState(d.state as "active" | "disabled_manually");
        else setCronState("unknown");
      })
      .catch(() => setCronState("unknown"));
  }, []);

  async function handleTrigger() {
    if (!confirm("Worker'ı şimdi tetiklemek istediğine emin misin? 3-6 dakikada yeni haberler pending kuyruğuna düşer.")) return;
    setTriggering(true);
    setOpMsg(null);
    try {
      const r = await fetch("/api/trigger", { method: "POST" });
      const out = await r.json();
      if (!r.ok) {
        setOpMsg({ kind: "err", text: `Tetikleme başarısız: ${out.error || r.status}` });
      } else {
        setOpMsg({ kind: "ok", text: out.message || "Worker tetiklendi." });
      }
    } catch (e) {
      setOpMsg({ kind: "err", text: `Ağ hatası: ${e}` });
    } finally {
      setTriggering(false);
    }
  }

  async function handleCronToggle() {
    setCronToggling(true);
    setOpMsg(null);
    try {
      const r = await fetch("/api/workflow", { method: "POST" });
      const out = await r.json();
      if (!r.ok) {
        setOpMsg({ kind: "err", text: `Cron değişimi başarısız: ${out.error || r.status}` });
      } else {
        setCronState(out.new_state);
        setOpMsg({
          kind: "ok",
          text: out.new_state === "active" ? "Cron aktif edildi (08:00 ve 18:00 İstanbul)." : "Cron durduruldu.",
        });
      }
    } catch (e) {
      setOpMsg({ kind: "err", text: `Ağ hatası: ${e}` });
    } finally {
      setCronToggling(false);
    }
  }
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<string, PendingItem[]> = {};
    for (const it of pending) {
      const k = it.category || "Genel";
      (g[k] ||= []).push(it);
    }
    return g;
  }, [pending]);

  const keepItems: PublishItem[] = pending
    .filter((p) => !rejected.has(p.id_hash))
    .map((r) => ({
      hash: r.id_hash,
      title: r.title,
      title_tr: r.title_tr,
      link: r.link,
      source: r.source,
      ai_insight: edits[r.id_hash] ?? r.ai_insight,
      impact_score: r.impact_score,
      category: r.category,
    }));

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const resp = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: keepItems,
          rejected: Array.from(rejected),
        }),
      });
      if (!resp.ok) {
        setError(`Hata: ${resp.status} ${await resp.text()}`);
        return;
      }
      const data = (await resp.json()) as PublishResult;
      setResult(data);
      setRejected(new Set());
      setEdits({});
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Sovereign<span style={{ color: "var(--cyan)" }}>.</span> Kokpit</h1>
        <p className="sub">Editöryal onay paneli</p>
        <div className="section-label">Durum</div>
        {oldestAgeHours === null ? (
          <div className="stat">
            <div className="label">Pending</div>
            <div className="value" style={{ color: "var(--text-dim)" }}>
              Yok
            </div>
          </div>
        ) : (
          <>
            <div className="stat">
              <div className="label">En eski pending</div>
              <div className="value">{oldestAgeHours.toFixed(1)} saat</div>
            </div>
            {autoHours > 0 && oldestAgeHours < autoHours && (
              <div className="stat">
                <div className="label">Otomatik yayına kalan</div>
                <div className="value">
                  {(autoHours - oldestAgeHours).toFixed(1)} saat
                </div>
              </div>
            )}
            {autoHours > 0 && oldestAgeHours >= autoHours && (
              <div className="warn-banner">
                ⏰ Sıradaki worker tikinde otomatik yayınlanacak.
              </div>
            )}
            {autoHours === 0 && (
              <div className="stat">
                <div className="label">Otomasyon</div>
                <div className="value" style={{ fontSize: 13 }}>
                  Kapalı (katı HITL)
                </div>
              </div>
            )}
          </>
        )}
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => router.refresh()}>🔄 Yenile</button>
          <form method="POST" action="/api/logout">
            <button type="submit" style={{ width: "100%" }}>
              Çıkış
            </button>
          </form>
          {userEmail && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-dim)",
                marginTop: 6,
                wordBreak: "break-all",
              }}
            >
              👤 {userEmail}
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        <h2>Editöryal Onay</h2>
        <p className="subtitle">
          Onay bekleyen makaleleri incele, gerekirse reddet/düzenle ve bülteni yayınla.
        </p>

        {/* Operasyonel aksiyonlar — public site'tan taşındı */}
        <div className="actions-bar">
          <div className="info">
            <h3>Pipeline</h3>
            <p>
              Worker manuel tetikleme · GitHub Actions cron (08:00 ve 18:00 İstanbul)
            </p>
          </div>
          <div className="btns">
            <button
              className="primary"
              onClick={handleTrigger}
              disabled={triggering}
              title="Worker'ı şimdi çalıştır → 3-6 dakikada yeni haberler pending'e düşer"
            >
              {triggering ? "Tetikleniyor…" : "🚀 Şimdi Tetikle"}
            </button>
            <button
              onClick={handleCronToggle}
              disabled={cronToggling || cronState === "loading"}
              className={
                cronState === "active"
                  ? "state-on"
                  : cronState === "disabled_manually"
                  ? "state-off"
                  : ""
              }
              title={
                cronState === "active"
                  ? "Otomatik cron aktif — tıkla durdur"
                  : cronState === "disabled_manually"
                  ? "Cron durduruldu — tıkla başlat"
                  : "Cron durumu yükleniyor…"
              }
            >
              {cronToggling ? (
                "Değişiyor…"
              ) : cronState === "loading" ? (
                "Cron…"
              ) : (
                <>
                  <span className="state-dot"></span>
                  {cronState === "active" ? "Cron Açık" : cronState === "disabled_manually" ? "Cron Kapalı" : "Cron ?"}
                </>
              )}
            </button>
          </div>
        </div>

        {opMsg && (
          <div
            className="result"
            style={
              opMsg.kind === "err"
                ? { borderLeftColor: "var(--alert)", borderColor: "rgba(207,34,46,0.3)" }
                : undefined
            }
          >
            <strong style={{ color: opMsg.kind === "err" ? "var(--alert)" : "var(--ok)" }}>
              {opMsg.kind === "err" ? "Hata" : "✓"}
            </strong>{" "}
            {opMsg.text}
          </div>
        )}

        {result && <PublishResultBanner result={result} onClose={() => setResult(null)} />}

        {error && (
          <div className="result" style={{ borderColor: "var(--danger)" }}>
            <strong style={{ color: "var(--danger)" }}>Yayın hatası</strong>
            <pre style={{ whiteSpace: "pre-wrap", margin: "8px 0 0" }}>{error}</pre>
          </div>
        )}

        {pending.length === 0 ? (
          <div className="empty">
            Şu an pending bekleyen haber yok. Worker bir sonraki tikte yeni haberler
            eklerse burada görünür.
          </div>
        ) : (
          <>
            <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
              Toplam <strong style={{ color: "var(--text)" }}>{pending.length}</strong>{" "}
              haber bekliyor.
            </div>

            {Object.keys(grouped)
              .sort()
              .map((cat) => (
                <section key={cat}>
                  <div className="category-header">
                    📁 {cat} · {grouped[cat].length} haber
                  </div>
                  {grouped[cat].map((item) => (
                    <ArticleCard
                      key={item.id_hash}
                      item={item}
                      rejected={rejected.has(item.id_hash)}
                      insightValue={edits[item.id_hash] ?? item.ai_insight ?? ""}
                      onToggleReject={() => {
                        setRejected((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id_hash)) next.delete(item.id_hash);
                          else next.add(item.id_hash);
                          return next;
                        });
                      }}
                      onEditInsight={(v) =>
                        setEdits((p) => ({ ...p, [item.id_hash]: v }))
                      }
                    />
                  ))}
                </section>
              ))}

            <div className="publish-bar">
              <div className="counts">
                <strong>{keepItems.length}</strong> yayına gidecek ·{" "}
                <strong>{rejected.size}</strong> reddedildi
              </div>
              <button
                className="primary"
                onClick={handlePublish}
                disabled={publishing || keepItems.length === 0}
              >
                {publishing
                  ? "Yayınlanıyor…"
                  : "🚀 Bülteni Yayınla (Beehiiv + Site)"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ArticleCard({
  item,
  rejected,
  insightValue,
  onToggleReject,
  onEditInsight,
}: {
  item: PendingItem;
  rejected: boolean;
  insightValue: string;
  onToggleReject: () => void;
  onEditInsight: (v: string) => void;
}) {
  const heading = item.title_tr || item.title || "(başlıksız)";
  return (
    <div className={rejected ? "article rejected" : "article"}>
      <div className="article-head">
        <div style={{ flex: 1 }}>
          <div className="article-title">
            {heading}
            {rejected && " 🚫"}
          </div>
          <div className="article-meta">
            📰 {item.source}
            {item.impact_score != null && (
              <>
                <span className="sep">·</span>
                <span className="score">
                  📊 Sinyal: {Math.round(item.impact_score)}/10
                </span>
              </>
            )}
            <span className="sep">·</span>
            <a href={item.link} target="_blank" rel="noopener noreferrer">
              Kaynak
            </a>
          </div>
        </div>
        <button
          className={rejected ? "" : "danger"}
          onClick={onToggleReject}
          style={{ flexShrink: 0 }}
        >
          {rejected ? "↩️ Geri Al" : "🚫 Reddet"}
        </button>
      </div>
      <div style={{ marginTop: 8 }}>
        <label
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Analist Sinyali (düzenlenebilir)
        </label>
        <textarea
          value={insightValue}
          disabled={rejected}
          onChange={(e) => onEditInsight(e.target.value)}
          style={{ marginTop: 4 }}
        />
      </div>
    </div>
  );
}

function PublishResultBanner({
  result,
  onClose,
}: {
  result: PublishResult;
  onClose: () => void;
}) {
  return (
    <div className="result">
      <div className="ok">
        ✅ Yayınlandı: {result.count} haber
        {result.beehiiv ? " · Beehiiv draft oluşturuldu" : " · Beehiiv atlandı"}
      </div>

      {result.social_posts.posts.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            📣 Sosyal Medya İçeriği
          </div>
          {result.social_posts.strategy_note && (
            <div className="note">💡 {result.social_posts.strategy_note}</div>
          )}
          {result.social_posts.posts.map((p, idx) => (
            <div key={idx} className="social-post">
              <div className="head">
                {p.platform || "?"} · {p.kind}
              </div>
              <pre>{p.content}</pre>
            </div>
          ))}
        </div>
      )}

      {result.social_posts.posts.length === 0 && (
        <div className="note">
          Sosyal post üretilmedi (GEMINI_API_KEY yok veya LLM hata verdi).
        </div>
      )}

      <details>
        <summary>📄 Markdown önizleme</summary>
        <pre>{result.markdown}</pre>
      </details>

      <div style={{ marginTop: 14 }}>
        <button onClick={onClose}>Özeti kapat</button>
      </div>
    </div>
  );
}
