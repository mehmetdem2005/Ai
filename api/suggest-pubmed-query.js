// /api/suggest-pubmed-query.js — Niş tanımından PubMed E-utilities query önerisi
//
// Kullanıcı serbest metinle niş tanımı yazıyor ("HER2+ metastatik meme · ADC ve
// direnç..."). Bu endpoint DeepSeek'e bu tanımı verip 3 farklı PubMed query
// önerisi alır — kullanıcı en uygunu seçer veya elle düzenler.
//
// PubMed query opsiyonel kalır (mevcut nişleri bozmamak için) ama bu öneri
// pratikte hemen hemen her niş için kullanılması gereken bir filtre — embedding
// match'i tek başına HER2+ "meme" demek için yeterince keskin değil.
//
// Body: { label, description }
// Resp: { queries: [string, string, string] }

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = process.env.DEEPSEEK_MODEL_SUGGEST || process.env.DEEPSEEK_MODEL_SUMMARY || "deepseek-chat";

async function verifyUser(token, supabaseUrl, supabaseAnonKey) {
  if (!token) return null;
  const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  return r.json();
}

const SYSTEM_PROMPT = `Sen tıbbi literatür sorgusu uzmanısın. Kullanıcı bir takip konusu
tanımlar (etiket + açıklama). PubMed E-utilities ile uyumlu, MeSH terimleri ve
boolean operatörler içeren 3 FARKLI sorgu öner:

- Sorgu 1 (GENİŞ): MeSH ana terim + sinonimler, kapsama önceliği
- Sorgu 2 (DAR): MeSH + spesifik alt başlıklar + popülasyon filtresi
- Sorgu 3 (KESİN): Spesifik ilaç/cihaz adı + spesifik hastalık alt-tipi + son 2 yıl

Kurallar:
- Türkçe açıklama YAZMA. Sadece JSON dön: {"queries": ["q1","q2","q3"]}
- PubMed sözdizimi: parantez, AND/OR/NOT, [MeSH], [tw], [tiab], [Year - Date]
- Çok uzun olmasın (her sorgu 200 karakter altı)
- Üç sorgu birbirinden YAPISAL olarak farklı olmalı (sadece kelime ekleme değil)
- Sadece JSON döndür, başına/sonuna açıklama yazma`;

async function callDeepSeek(label, description, apiKey) {
  const r = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Etiket: ${label}\nAçıklama: ${description}` },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`deepseek_failed_${r.status}: ${t.slice(0, 200)}`);
  }
  const data = await r.json();
  const content = (((data.choices || [])[0] || {}).message || {}).content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (_) {
    throw new Error("deepseek_non_json");
  }
  const arr = parsed.queries;
  if (!Array.isArray(arr) || arr.length === 0) throw new Error("empty_suggestions");
  return arr.slice(0, 3).map((q) => String(q).trim()).filter(Boolean);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !apiKey) {
    return res.status(500).json({ error: "service_misconfigured" });
  }

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const user = await verifyUser(token, supabaseUrl, supabaseAnonKey);
  if (!user) return res.status(401).json({ error: "auth_required" });

  const body = req.body || {};
  const label = (body.label || "").trim();
  const description = (body.description || "").trim();
  if (label.length < 3 || description.length < 20) {
    return res.status(400).json({ error: "insufficient_context" });
  }

  let queries;
  try {
    queries = await callDeepSeek(label, description, apiKey);
  } catch (e) {
    return res.status(502).json({ error: "suggest_failed", message: String(e.message || e) });
  }

  return res.status(200).json({ queries });
};
