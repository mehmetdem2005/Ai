// /api/preview-match.js — Niş tanımı için canlı eşleşme önizlemesi
//
// Onboarding'de kullanıcı niş tanımını yazar/düzenler. "Önizle" butonuna
// basınca bu endpoint:
//   1. Kullanıcı JWT'sini doğrular (auth zorunlu — embedding maliyeti var)
//   2. OpenAI text-embedding-3-small ile niş metnini embedler
//   3. Supabase RPC match_items_for_niche (v1, dedup'suz — bu kullanıcının
//      brief geçmişine bakmaz, sadece havuzdan match) ile son N saatlik
//      item'lara karşı benzerlik araması yapar
//   4. {count, samples[]} döner — kullanıcı threshold'unu kalibre etsin
//
// Body: { label, description, pubmed_query, threshold, lookback_hours }
//        threshold default 0.55, lookback default 168 (1 hafta — kullanıcıya
//        anlamlı sayı göstermek için günlük 48s'den daha geniş)

const OPENAI_EMBED_URL = "https://api.openai.com/v1/embeddings";
const EMBED_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

async function verifyUser(token, supabaseUrl, supabaseAnonKey) {
  if (!token) return null;
  const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  return r.json();
}

async function embed(text, openaiKey) {
  const r = await fetch(OPENAI_EMBED_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!r.ok) {
    const errBody = await r.text();
    throw new Error(`embed_failed_${r.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await r.json();
  return data.data[0].embedding;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseKey = process.env.SUPABASE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !supabaseKey || !openaiKey) {
    return res.status(500).json({ error: "service_misconfigured" });
  }

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const user = await verifyUser(token, supabaseUrl, supabaseAnonKey);
  if (!user) return res.status(401).json({ error: "auth_required" });

  const body = req.body || {};
  const label = (body.label || "").trim();
  const description = (body.description || "").trim();
  const pubmedQuery = (body.pubmed_query || "").trim();
  const threshold = Math.max(0.2, Math.min(0.95, Number(body.threshold) || 0.55));
  const lookbackHours = Math.max(24, Math.min(720, Number(body.lookback_hours) || 168));

  const text = [label, description, pubmedQuery].filter(Boolean).join("\n");
  if (text.length < 20) {
    return res.status(400).json({ error: "description_too_short" });
  }

  let vec;
  try {
    vec = await embed(text, openaiKey);
  } catch (e) {
    return res.status(502).json({ error: "embed_failed", message: String(e.message || e) });
  }

  const since = new Date(Date.now() - lookbackHours * 3600 * 1000).toISOString();
  const rpcResp = await fetch(`${supabaseUrl}/rest/v1/rpc/match_items_for_niche`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      niche_embedding: vec,
      match_threshold: threshold,
      match_count: 100,
      since,
    }),
  });
  if (!rpcResp.ok) {
    const t = await rpcResp.text();
    return res.status(502).json({ error: "rpc_failed", message: t.slice(0, 300) });
  }
  const rows = await rpcResp.json();

  const samples = (rows || []).slice(0, 5).map((r) => ({
    title: r.title,
    journal: r.journal,
    source_type: r.source_type,
    score: Number(r.score) || 0,
    published_at: r.published_at,
  }));

  return res.status(200).json({
    count: rows.length,
    threshold,
    lookback_hours: lookbackHours,
    samples,
  });
};
