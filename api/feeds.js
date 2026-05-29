// Public site → Supabase feeds tablosu için CRUD endpoint'i.
// GET: listele (anon kullanıcı da görebilir — sadece okuma)
// POST/PATCH/DELETE: admin (Supabase Auth JWT'sinde role=admin)

const SUPABASE_REST = "/rest/v1/feeds";

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

  // GET — herkese açık, sadece okuma
  if (req.method === "GET") {
    const r = await fetch(`${supabaseUrl}${SUPABASE_REST}?select=*&order=created_at.desc`, {
      headers: sbHeaders,
    });
    const body = await r.text();
    res.status(r.status).setHeader("Content-Type", "application/json").send(body);
    return;
  }

  // Yazma operasyonları admin-only
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const admin = await verifyAdmin(token, supabaseUrl, supabaseKey);
  if (!admin) {
    return res.status(403).json({ error: "admin_required" });
  }

  if (req.method === "POST") {
    let body;
    try { body = await readJsonBody(req); } catch { return res.status(400).json({ error: "invalid_json" }); }
    const { name, url, active = true } = body || {};
    if (!name || !url) return res.status(400).json({ error: "name_and_url_required" });
    const r = await fetch(`${supabaseUrl}${SUPABASE_REST}`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ name, url, active: Boolean(active) }),
    });
    const text = await r.text();
    return res.status(r.status).setHeader("Content-Type", "application/json").send(text);
  }

  if (req.method === "PATCH") {
    const id = req.query.id || (req.url.split("?")[1] || "").split("=")[1];
    if (!id) return res.status(400).json({ error: "id_required" });
    let body;
    try { body = await readJsonBody(req); } catch { return res.status(400).json({ error: "invalid_json" }); }
    const r = await fetch(`${supabaseUrl}${SUPABASE_REST}?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...sbHeaders, Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    return res.status(r.status).setHeader("Content-Type", "application/json").send(text);
  }

  if (req.method === "DELETE") {
    const id = req.query.id || (req.url.split("?")[1] || "").split("=")[1];
    if (!id) return res.status(400).json({ error: "id_required" });
    const r = await fetch(`${supabaseUrl}${SUPABASE_REST}?id=eq.${id}`, {
      method: "DELETE",
      headers: sbHeaders,
    });
    return res.status(r.status).json({ ok: r.ok, id });
  }

  res.setHeader("Allow", "GET, POST, PATCH, DELETE");
  return res.status(405).json({ error: "method_not_allowed" });
};
