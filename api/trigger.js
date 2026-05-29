// Public site → manuel bülten tetikleme.
// Browser, Supabase Auth ile login olmuş kullanıcının JWT'sini Authorization header'ında gönderir.
// Bu fonksiyon JWT'yi Supabase'de doğrular, kullanıcının app_metadata.role === "admin" olup olmadığını
// kontrol eder, sonra GitHub workflow_dispatch ile bulletin.yml'i tetikler.

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return res.status(401).json({ error: "missing_token" });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "supabase_not_configured" });
  }

  // 1. JWT'yi Supabase'e doğrulat → kullanıcı + rol bilgisi
  let user;
  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!r.ok) {
      return res.status(401).json({ error: "invalid_token" });
    }
    user = await r.json();
  } catch (exc) {
    return res.status(502).json({ error: "supabase_error", detail: String(exc) });
  }

  const role = user && user.app_metadata && user.app_metadata.role;
  if (role !== "admin") {
    return res.status(403).json({ error: "not_admin" });
  }

  // 2. GitHub workflow_dispatch — bulletin.yml'i tetikle
  const ghToken = process.env.GH_DEPLOY_TOKEN;
  const ghRepo = process.env.GH_REPO || "mehmetdem2005/Ai";
  const ghWorkflow = process.env.GH_WORKFLOW || "bulletin.yml";
  const ghRef = process.env.GH_REF || "main";
  if (!ghToken) {
    return res.status(500).json({ error: "github_token_missing" });
  }

  try {
    const ghResp = await fetch(
      `https://api.github.com/repos/${ghRepo}/actions/workflows/${ghWorkflow}/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${ghToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "sovereign-trigger",
        },
        body: JSON.stringify({ ref: ghRef }),
      }
    );
    if (ghResp.status !== 204) {
      const text = await ghResp.text();
      return res.status(502).json({
        error: "github_dispatch_failed",
        status: ghResp.status,
        detail: text.slice(0, 500),
      });
    }
  } catch (exc) {
    return res.status(502).json({ error: "github_error", detail: String(exc) });
  }

  return res.status(200).json({
    ok: true,
    message: "Bülten üretimi tetiklendi. Yeni içerik 3-6 dakika içinde panelde görünür.",
    repo: ghRepo,
    workflow: ghWorkflow,
    ref: ghRef,
    triggered_by: user.email,
  });
};
