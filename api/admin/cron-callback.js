// GitHub Actions workflow'larından çağrılan callback. Worker tamamlandığında
// cron_runs satırını günceller.
//
// Çağrı (workflow YML'inden):
//   curl -X POST $CRON_CALLBACK_URL \
//     -H "X-Callback-Secret: $CRON_CB_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"workflow":"sovereign-daily.yml","github_run_id":1234,"status":"success",
//          "started_at":"...","finished_at":"...","summary":{"items":42}}'
//
// Secret'siz çağrılar reddedilir. SUPABASE_KEY ile RPC çağrımı yapılır.

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const provided = req.headers["x-callback-secret"] || "";
  const expected = process.env.CRON_CB_SECRET || "";
  if (!expected || provided !== expected) {
    return res.status(401).json({ error: "invalid_secret" });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: "supabase_not_configured" });

  const body = req.body || {};
  if (!body.workflow) return res.status(400).json({ error: "missing workflow" });

  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/rpc/record_cron_run`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_payload: body }),
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: "rpc_failed", status: r.status, detail: text.slice(0, 500) });
    }
    const out = await r.json();
    return res.status(200).json({ ok: true, id: out });
  } catch (exc) {
    return res.status(502).json({ error: "supabase_error", detail: String(exc) });
  }
};
