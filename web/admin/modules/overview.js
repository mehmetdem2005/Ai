(function () {
  const Admin = window.Admin;
  if (!Admin) return;

  Admin.register("overview", {
    mount(section, ctx) {
      const db = Admin.db;
      const kpis = section.querySelectorAll(".kpi-val");
      // KPI'lar: profiles, niches, briefs (son 7 gün), cron son run
      Promise.allSettled([
        db.list("profiles", { count: "exact", limit: 1 }),
        db.list("niches", { count: "exact", limit: 1, eq: [["is_active", true]] }),
        db.list("briefs", {
          count: "exact", limit: 1,
          gte: ["created_at", new Date(Date.now() - 7 * 86400e3).toISOString()],
        }),
        db.list("cron_runs", { limit: 1, order: { col: "created_at", asc: false }, select: "status,created_at,workflow" }),
      ]).then((results) => {
        const [u, n, b, c] = results;
        if (u.status === "fulfilled") section.querySelector("#kpiUsers").textContent = u.value.count ?? "—";
        if (n.status === "fulfilled") section.querySelector("#kpiNiches").textContent = n.value.count ?? "—";
        if (b.status === "fulfilled") section.querySelector("#kpiBriefs").textContent = b.value.count ?? "—";
        if (c.status === "fulfilled" && c.value.data.length) {
          const r = c.value.data[0];
          section.querySelector("#kpiCron").innerHTML =
            `${Admin.badgeHTML(r.status)} <span style="font-size:11.5px;color:var(--mid);font-family:var(--font-mono)">${new Date(r.created_at).toLocaleDateString("tr-TR")}</span>`;
        }
      });

      // Placeholder card'ı zengin bilgilendirme ile değiştir
      const ph = section.querySelector(".card.placeholder");
      if (ph) {
        ph.classList.remove("placeholder");
        ph.innerHTML = `
          <h3 style="margin:0 0 8px;font-size:14px;font-weight:600">Hızlı erişim</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
            <a href="#/articles" class="btn">Makaleleri yönet</a>
            <a href="#/cms" class="btn">Site metinlerini düzenle</a>
            <a href="#/sources" class="btn">Kaynakları gör</a>
            <a href="#/audit" class="btn">Audit log</a>
          </div>
          <div style="margin-top:14px;font-size:12.5px;color:var(--mid)">
            Rol: <strong style="color:var(--ink)">${Admin.escapeHtml(ctx.role)}</strong>
            · Yetenekler: <span style="font-family:var(--font-mono)">${ctx.capabilities.join(", ")}</span>
          </div>
        `;
      }
    },
  });
})();
