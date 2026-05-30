// Admin paneli için workflow_dispatch + cron_runs kayıt.
// Body: { workflow: 'bulletin.yml' | 'sovereign-daily.yml', ref?: 'main', inputs?: {...} }
// Auth: kullanıcı JWT'si → admin_users rolü kontrol → GH workflow dispatch → cron_runs insert.

const ALLOWED_WORKFLOWS = new Set([
  "bulletin.yml",
  "sovereign-daily.yml",
]);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "missing_token" });

  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: "supabase_not_configured" });

  let user;
  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return res.status(401).json({ error: "invalid_token", status: r.status });
    user = await r.json();
  } catch (exc) {
    return res.status(502).json({ error: "auth_check_failed", detail: String(exc) });
  }

  // Rol kontrolü: admin_users tablosundan + fallback app_metadata.role
  let isAdmin = false;
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/admin_users?user_id=eq.${user.id}&active=eq.true&select=role`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    if (r.ok) {
      const rows = await r.json();
      isAdmin = rows.length > 0;
    }
  } catch { /* fallback */ }
  if (!isAdmin && user.app_metadata?.role !== "admin") {
    return res.status(403).json({ error: "forbidden" });
  }

  const body = req.body || {};
  const workflow = (body.workflow || "").toString();
  const ref = (body.ref || "main").toString();
  const inputs = body.inputs && typeof body.inputs === "object" ? body.inputs : {};

  if (!ALLOWED_WORKFLOWS.has(workflow)) {
    return res.status(400).json({ error: "workflow_not_allowed", allowed: Array.from(ALLOWED_WORKFLOWS) });
  }

  const ghToken = process.env.GH_DEPLOY_TOKEN;
  const ghRepo = process.env.GH_REPO || "mehmetdem2005/Ai";
  if (!ghToken) return res.status(500).json({ error: "github_token_missing" });

  try {
    const ghResp = await fetch(
      `https://api.github.com/repos/${ghRepo}/actions/workflows/${workflow}/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${ghToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "sovereign-admin-dispatch",
        },
        body: JSON.stringify({ ref, inputs }),
      }
    );
    if (ghResp.status !== 204) {
      const text = await ghResp.text();
      return res.status(502).json({ error: "github_dispatch_failed", status: ghResp.status, detail: text.slice(0, 500) });
    }
  } catch (exc) {
    return res.status(502).json({ error: "github_error", detail: String(exc) });
  }

  // cron_runs'a 'queued' kaydı düş — record_cron_run RPC servis rolü ile
  try {
    const payload = {
      workflow,
      status: "queued",
      trigger_source: "manual",
      triggered_by: user.id,
      inputs,
      started_at: new Date().toISOString(),
    };
    await fetch(`${supabaseUrl}/rest/v1/rpc/record_cron_run`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_payload: payload }),
    });
  } catch { /* sessizce; mutex değil */ }

  return res.status(200).json({
    ok: true,
    message: `${workflow} tetiklendi.`,
    workflow, ref, inputs,
    triggered_by: user.email,
  });
};
