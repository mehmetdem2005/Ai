// Public site → bulletin.yml workflow'unun durumunu döndürür (active | disabled_manually).
// Sadece login olmuş admin için. UI bunu sayfa açılışında ve toggle sonrası okur.

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "missing_token" });

  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "supabase_not_configured" });
  }

  let user;
  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return res.status(401).json({ error: "invalid_token" });
    user = await r.json();
  } catch (exc) {
    return res.status(502).json({ error: "supabase_error", detail: String(exc) });
  }

  const role = user && user.app_metadata && user.app_metadata.role;
  if (role !== "admin") return res.status(403).json({ error: "not_admin" });

  const ghToken = process.env.GH_DEPLOY_TOKEN;
  const ghRepo = process.env.GH_REPO || "mehmetdem2005/Ai";
  const ghWorkflow = process.env.GH_WORKFLOW || "bulletin.yml";
  if (!ghToken) return res.status(500).json({ error: "github_token_missing" });

  try {
    const ghResp = await fetch(
      `https://api.github.com/repos/${ghRepo}/actions/workflows/${ghWorkflow}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${ghToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "sovereign-workflow-state",
        },
      }
    );
    if (!ghResp.ok) {
      const text = await ghResp.text();
      return res.status(502).json({
        error: "github_get_failed",
        status: ghResp.status,
        detail: text.slice(0, 300),
      });
    }
    const wf = await ghResp.json();
    return res.status(200).json({
      state: wf.state,
      name: wf.name,
      workflow: ghWorkflow,
    });
  } catch (exc) {
    return res.status(502).json({ error: "github_error", detail: String(exc) });
  }
};
