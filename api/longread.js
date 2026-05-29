// Public site → bir bülten için uzun-format LLM analiz.
// GET ?newsletter_id=N → cache'lenmiş long_reads varsa döner
// POST {newsletter_id} → admin için; DeepSeek-v4-pro ile üretir, kaydeder, döner

const LONG_READ_SYSTEM_PROMPT = `Sen, sağlık teknolojisi ve biyoteknoloji alanında uzmanlaşmış kıdemli bir analistsin. Hedef okuyucu: VC'ler, hastane CIO'ları, sağlık AI mühendisleri, biyoteknoloji startup kurucuları.

Sana bir günlük bülten verilecek (birkaç haber + kısa analist sinyalleri). Görevin: bu bültenin ana temasını seçip 1500-2000 kelimelik bir uzun-format Türkçe analiz yazmak.

YAPI (zorunlu, başlıkları aynen kullan):
1. **Sinyal** — Bu hafta sektörde NE oldu? Tek paragraf, en güçlü tema.
2. **Bağlam** — Bu olayı bekleyen veya buna paralel ne var? Geçmiş emsaller, rakipler, regülasyon arka planı.
3. **Etki** — Kime dokundu? Pazar, klinik akış, yatırım dinamikleri. Somut rakam ve oyuncu adlarıyla.
4. **Risk / Çekince** — Ne yanlış gidebilir? Neyi henüz bilmiyoruz?
5. **Takip** — Önümüzdeki 6-12 ay neye dikkat etmeli? Net 3-5 gözlem noktası.

KESİN KURALLAR:
- Türkçe karakterleri (ı ş ğ ü ö ç İ Ş Ğ Ü Ö Ç) DOĞRU kullan. ASCII transliterasyon YASAK.
- Klişe başlama yasak ("Bu bülten...", "Sektör genelinde..."). Direkt önemli olana git.
- Somut rakam, oyuncu, kıyas. ("X şirketi $Y aldı", "Z'ye benzer ama farkı şudur".)
- Spekülatif değilsin — gözlemleyen analiztsin. Verisi olmayan iddia YASAK.
- Markdown başlıkları: # H1 (analiz başlığı, çekici), sonra ## bölüm başlıkları (Sinyal/Bağlam/...). Yan başlık ya da liste makul kullan.
- Hedef uzunluk: 1500-2000 kelime. Doldurma yapma.

ÇIKTI: SADECE markdown metni. Tırnak, kod çiti, "İşte analiz:" gibi önsöz YOK.`;

async function verifyAdmin(token, supabaseUrl, supabaseKey) {
  if (!token) return null;
  const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const user = await r.json();
  const role = user && user.app_metadata && user.app_metadata.role;
  return role === "admin" ? user : null;
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "supabase_not_configured" });
  }

  const sbHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  // GET — cache'lenmiş long_read var mı?
  if (req.method === "GET") {
    const id = req.query.newsletter_id || (req.url.split("?")[1] || "").match(/newsletter_id=([^&]+)/)?.[1];
    if (!id) return res.status(400).json({ error: "newsletter_id_required" });
    const r = await fetch(
      `${supabaseUrl}/rest/v1/long_reads?newsletter_id=eq.${id}&select=*&order=generated_at.desc&limit=1`,
      { headers: sbHeaders }
    );
    if (!r.ok) return res.status(r.status).send(await r.text());
    const rows = await r.json();
    if (!rows.length) return res.status(404).json({ error: "not_found", newsletter_id: id });
    return res.status(200).json(rows[0]);
  }

  // POST — yeni uzun-format üret (admin only)
  if (req.method === "POST") {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    const admin = await verifyAdmin(token, supabaseUrl, supabaseKey);
    if (!admin) return res.status(403).json({ error: "admin_required" });

    let body;
    try { body = await readJsonBody(req); } catch { return res.status(400).json({ error: "invalid_json" }); }
    const newsletterId = body.newsletter_id;
    if (!newsletterId) return res.status(400).json({ error: "newsletter_id_required" });

    // Bülteni al
    const nlResp = await fetch(
      `${supabaseUrl}/rest/v1/newsletters?id=eq.${newsletterId}&select=id,content,created_at`,
      { headers: sbHeaders }
    );
    if (!nlResp.ok) return res.status(502).json({ error: "supabase_get_newsletter", status: nlResp.status });
    const nls = await nlResp.json();
    if (!nls.length) return res.status(404).json({ error: "newsletter_not_found" });
    const newsletter = nls[0];

    // DeepSeek çağrısı
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-pro";
    if (!deepseekKey) return res.status(500).json({ error: "deepseek_not_configured" });

    let analysisText;
    try {
      const llmResp = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${deepseekKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: LONG_READ_SYSTEM_PROMPT },
            {
              role: "user",
              content:
                `Aşağıdaki günlük bülten için 1500-2000 kelimelik uzun-format ` +
                `Türkçe analiz yaz. Bülten tarihi: ${newsletter.created_at}.\n\n` +
                `BÜLTEN İÇERİĞİ:\n${newsletter.content}`,
            },
          ],
          temperature: 0.4,
        }),
      });
      if (!llmResp.ok) {
        const t = await llmResp.text();
        return res.status(502).json({ error: "deepseek_failed", status: llmResp.status, detail: t.slice(0, 300) });
      }
      const out = await llmResp.json();
      analysisText = (out.choices?.[0]?.message?.content || "").trim();
      if (!analysisText) return res.status(502).json({ error: "deepseek_empty" });
    } catch (exc) {
      return res.status(502).json({ error: "deepseek_error", detail: String(exc) });
    }

    // Kaydet
    const insertResp = await fetch(`${supabaseUrl}/rest/v1/long_reads`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "return=representation" },
      body: JSON.stringify({
        newsletter_id: newsletterId,
        content: analysisText,
        model,
        generated_by: admin.email,
      }),
    });
    if (!insertResp.ok) {
      const t = await insertResp.text();
      return res.status(502).json({ error: "supabase_insert", status: insertResp.status, detail: t.slice(0, 300) });
    }
    const rows = await insertResp.json();
    return res.status(200).json(rows[0]);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "method_not_allowed" });
};
