// Dashboard için gerçek pipeline metrikleri (admin-only).
// Supabase counts + GitHub Actions runs + env config tek JSON'da döner.

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

// Tabloya göre uygun primary key — Supabase REST'te select için bir kolon adı gerekir.
const TABLE_KEY = {
  articles: "id_hash",
  newsletters: "id",
  feeds: "id",
  long_reads: "id",
};

async function pgCount(supabaseUrl, sbHeaders, table, filter = "") {
  const col = TABLE_KEY[table] || "id";
  const url = `${supabaseUrl}/rest/v1/${table}?select=${col}${filter ? "&" + filter : ""}`;
  const r = await fetch(url, {
    headers: { ...sbHeaders, Prefer: "count=exact", Range: "0-0" },
  });
  if (!r.ok) return null;
  const range = r.headers.get("content-range") || "";
  const m = range.match(/\/(\d+|\*)$/);
  return m ? Number(m[1]) : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "supabase_not_configured" });
  }

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const admin = await verifyAdmin(token, supabaseUrl, supabaseKey);
  if (!admin) return res.status(403).json({ error: "admin_required" });

  const sbHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  // Counts (paralel)
  const [newslettersCount, articlesCount, pendingCount, publishedCount] = await Promise.all([
    pgCount(supabaseUrl, sbHeaders, "newsletters"),
    pgCount(supabaseUrl, sbHeaders, "articles"),
    pgCount(supabaseUrl, sbHeaders, "articles", "status=eq.pending"),
    pgCount(supabaseUrl, sbHeaders, "articles", "status=eq.published"),
  ]);

  // Son 7g en yüksek skor
  const recentResp = await fetch(
    `${supabaseUrl}/rest/v1/articles?select=impact_score,processed_at,title_tr,title&processed_at=gte.${new Date(Date.now() - 7 * 86400000).toISOString()}&order=impact_score.desc.nullslast&limit=1`,
    { headers: sbHeaders }
  );
  const recentTop = recentResp.ok ? (await recentResp.json())[0] || null : null;

  // En son bülten
  const latestResp = await fetch(
    `${supabaseUrl}/rest/v1/newsletters?select=id,article_count,created_at&order=created_at.desc&limit=1`,
    { headers: sbHeaders }
  );
  const latestNewsletter = latestResp.ok ? (await latestResp.json())[0] || null : null;

  // GitHub Actions: workflow durumu + son 5 run
  const ghToken = process.env.GH_DEPLOY_TOKEN;
  const ghRepo = process.env.GH_REPO || "mehmetdem2005/Ai";
  const ghWorkflow = process.env.GH_WORKFLOW || "bulletin.yml";
  let workflowState = null;
  let recentRuns = [];
  if (ghToken) {
    try {
      const [wfResp, runsResp] = await Promise.all([
        fetch(`https://api.github.com/repos/${ghRepo}/actions/workflows/${ghWorkflow}`, {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${ghToken}`,
            "User-Agent": "sovereign-dashboard",
          },
        }),
        fetch(`https://api.github.com/repos/${ghRepo}/actions/workflows/${ghWorkflow}/runs?per_page=5`, {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${ghToken}`,
            "User-Agent": "sovereign-dashboard",
          },
        }),
      ]);
      if (wfResp.ok) {
        const wf = await wfResp.json();
        workflowState = wf.state;
      }
      if (runsResp.ok) {
        const data = await runsResp.json();
        recentRuns = (data.workflow_runs || []).map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          conclusion: r.conclusion,
          event: r.event,
          created_at: r.created_at,
          updated_at: r.updated_at,
          html_url: r.html_url,
          duration_sec: r.run_started_at && r.updated_at
            ? Math.round((new Date(r.updated_at).getTime() - new Date(r.run_started_at).getTime()) / 1000)
            : null,
        }));
      }
    } catch (exc) {
      console.error("GH fetch error:", exc);
    }
  }

  return res.status(200).json({
    counts: {
      newsletters: newslettersCount,
      articles: articlesCount,
      pending: pendingCount,
      published: publishedCount,
    },
    recent_top_article: recentTop,
    latest_newsletter: latestNewsletter,
    workflow: {
      repo: ghRepo,
      workflow: ghWorkflow,
      state: workflowState,
      cron_schedule_utc: "0 5,15 * * *",
      cron_schedule_human: "08:00 ve 18:00 İstanbul (UTC+3)",
    },
    recent_runs: recentRuns,
    config: {
      llm_provider: process.env.LLM_PROVIDER || "deepseek",
      llm_model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
      auto_publish_after_hours: Number(process.env.AUTO_PUBLISH_AFTER_HOURS || "24"),
      min_impact_score: Number(process.env.MIN_IMPACT_SCORE || "7"),
    },
    fetched_at: new Date().toISOString(),
    triggered_by: admin.email,
  });
};
