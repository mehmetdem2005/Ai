(function () {
  const SUPABASE_URL = "__SUPABASE_URL__";
  const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";

  const ROUTES = {
    overview:    { label: "Özet" },
    newsletters: { label: "Bültenler",       parent: "İçerik" },
    articles:    { label: "Makaleler",       parent: "İçerik" },
    cms:         { label: "Site metinleri",  parent: "İçerik" },
    sources:     { label: "Kaynaklar",       parent: "Kaynak & İşlem" },
    cron:        { label: "Cron & worker",   parent: "Kaynak & İşlem" },
    users:       { label: "Pro kullanıcılar", parent: "Kullanıcı" },
    iam:         { label: "Erişim & roller", parent: "Kullanıcı" },
    audit:       { label: "Audit log",       parent: "Sistem" },
    settings:    { label: "Ayarlar",          parent: "Sistem" },
  };

  let sb = null;

  function bounce() {
    location.replace("/");
  }

  function parseHash() {
    const raw = (location.hash || "#/overview").replace(/^#\/?/, "");
    const [name] = raw.split("/");
    return ROUTES[name] ? name : "overview";
  }

  function setActiveRoute(name) {
    document.querySelectorAll(".route").forEach(el => {
      el.hidden = el.dataset.route !== name;
    });
    document.querySelectorAll(".sb-item").forEach(el => {
      el.classList.toggle("active", el.dataset.route === name);
    });
    renderCrumbs(name);
    document.title = `Sovereign · ${ROUTES[name].label}`;
    document.querySelector(".content")?.scrollTo(0, 0);
  }

  function renderCrumbs(name) {
    const r = ROUTES[name];
    const crumbs = document.getElementById("crumbs");
    const parts = [`<a href="#/overview">Admin</a>`];
    if (r.parent) parts.push(`<span class="sep">/</span><span>${r.parent}</span>`);
    parts.push(`<span class="sep">/</span><span class="current">${r.label}</span>`);
    crumbs.innerHTML = parts.join(" ");
  }

  function bindShellEvents() {
    document.getElementById("sbCollapse")?.addEventListener("click", () => {
      const app = document.getElementById("adminApp");
      app.classList.toggle("sb-collapsed");
      localStorage.setItem("admin_sb_collapsed", app.classList.contains("sb-collapsed") ? "1" : "0");
    });
    document.getElementById("sbToggleMobile")?.addEventListener("click", () => {
      document.getElementById("adminApp").classList.toggle("sb-mobile-open");
    });
    document.getElementById("userPill")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const dd = document.getElementById("userDD");
      dd.hidden = !dd.hidden;
    });
    document.addEventListener("click", () => {
      const dd = document.getElementById("userDD");
      if (dd) dd.hidden = true;
    });
    document.getElementById("signOutBtn")?.addEventListener("click", async () => {
      await sb.auth.signOut();
      bounce();
    });
    window.addEventListener("hashchange", () => setActiveRoute(parseHash()));
    if (localStorage.getItem("admin_sb_collapsed") === "1") {
      document.getElementById("adminApp").classList.add("sb-collapsed");
    }
  }

  async function loadOverview() {
    if (!sb) return;
    try {
      const ops = [
        sb.from("profiles").select("id", { count: "exact", head: true }),
        sb.from("niches").select("id", { count: "exact", head: true }).eq("active", true),
        sb.from("briefs").select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 7 * 86400e3).toISOString()),
      ];
      const [u, n, b] = await Promise.all(ops);
      document.getElementById("kpiUsers").textContent = u.count ?? "—";
      document.getElementById("kpiNiches").textContent = n.count ?? "—";
      document.getElementById("kpiBriefs").textContent = b.count ?? "—";
      document.getElementById("kpiCron").textContent = "—";
    } catch (e) {
      // tablo/RLS yok: sessizce — KPI'lar — kalır
    }
  }

  function showApp(session) {
    document.body.hidden = false;
    document.getElementById("adminApp").hidden = false;
    const email = session.user.email || "admin";
    document.getElementById("userEmail").textContent = email;
    document.getElementById("userAvatar").textContent = (email[0] || "·").toUpperCase();
    bindShellEvents();
    setActiveRoute(parseHash());
    loadOverview();
  }

  async function init() {
    if (!window.supabase || SUPABASE_URL.indexOf("__") === 0) {
      bounce();
      return;
    }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "sov-auth" },
    });
    const { data: { session } } = await sb.auth.getSession();
    const role = session?.user?.app_metadata?.role;
    if (!session || role !== "admin") {
      bounce();
      return;
    }
    showApp(session);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
