(function () {
  const Admin = window.Admin;
  if (!Admin) return;

  Admin.register("settings", {
    async mount(section, ctx) {
      const ph = section.querySelector(".card.placeholder");
      if (ph) ph.remove();
      const head = section.querySelector(".page-head");
      const container = document.createElement("div");
      head.after(container);

      container.innerHTML = `
        <div class="settings-grid">
          <div class="settings-card">
            <h3>Hesap</h3>
            <div class="kv"><span>Email</span><strong style="font-family:var(--font-mono);font-size:13px">${Admin.escapeHtml(ctx.session.user.email || "—")}</strong></div>
            <div class="kv"><span>User ID</span><code style="font-family:var(--font-mono);font-size:11.5px">${ctx.session.user.id}</code></div>
            <div class="kv"><span>Rol</span>${Admin.badgeHTML(ctx.role, ctx.role === "superadmin" ? "err" : "info")}</div>
            <div class="kv"><span>Yetenekler</span><code style="font-family:var(--font-mono);font-size:11px">${ctx.capabilities.join(", ")}</code></div>
          </div>

          <div class="settings-card">
            <h3>Integrasyon sağlığı</h3>
            <div class="kv"><span>Supabase</span><span id="hSupa">…</span></div>
            <div class="kv"><span>Edge Function /api</span><span id="hApi">…</span></div>
            <div class="kv"><span>GitHub Actions</span><span id="hGh">—</span></div>
          </div>

          <div class="settings-card">
            <h3>Veri durumu</h3>
            <div class="kv"><span>Toplam Pro kullanıcı</span><strong id="cUsers">…</strong></div>
            <div class="kv"><span>Aktif niche</span><strong id="cNiches">…</strong></div>
            <div class="kv"><span>Toplam item</span><strong id="cItems">…</strong></div>
            <div class="kv"><span>Toplam bülten</span><strong id="cNews">…</strong></div>
            <div class="kv"><span>Audit kaydı (7g)</span><strong id="cAudit">…</strong></div>
          </div>

          <div class="settings-card">
            <h3>Klavye</h3>
            <p style="font-size:13px;color:var(--mid);margin:0 0 10px">
              Tüm panelde geçerli kısayollar.
            </p>
            <button class="btn" id="showShortcuts">Kısayolları göster (?)</button>
          </div>
        </div>
      `;

      const style = document.createElement("style");
      style.textContent = `
        .settings-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 14px;
        }
        .settings-card {
          background: var(--surface); border: 1px solid var(--line);
          border-radius: var(--radius-lg); padding: 18px;
        }
        .settings-card h3 {
          margin: 0 0 12px; font-size: 14px; font-weight: 600;
          color: var(--ink); padding-bottom: 8px; border-bottom: 1px solid var(--line-2);
        }
        .kv {
          display: flex; align-items: center; justify-content: space-between;
          padding: 6px 0; font-size: 13.5px;
          border-bottom: 1px dashed var(--line-2);
        }
        .kv:last-child { border-bottom: none; }
        .kv span { color: var(--mid); }
      `;
      document.head.appendChild(style);

      document.getElementById("showShortcuts").onclick = () => Admin.keys.showHelp();

      // Sağlık kontrolleri
      const setH = (id, ok, msg) => {
        const el = document.getElementById(id);
        el.innerHTML = Admin.badgeHTML(ok ? "OK" : "ERR", ok ? "ok" : "err") +
          (msg ? ` <span style="font-size:11.5px;color:var(--mid);margin-left:6px">${msg}</span>` : "");
      };

      // Supabase ping
      Admin.db.list("admin_roles", { limit: 1 })
        .then(() => setH("hSupa", true, "auth + RLS")).catch(() => setH("hSupa", false));

      // API ping
      fetch("/api/admin/dispatch", { method: "OPTIONS" }).then(() => setH("hApi", true, "reachable"))
        .catch(() => setH("hApi", false));

      // Veri sayıları
      Promise.allSettled([
        Admin.db.list("profiles",  { count: "exact", limit: 1 }),
        Admin.db.list("niches",    { count: "exact", limit: 1, eq: [["is_active", true]] }),
        Admin.db.list("items",     { count: "exact", limit: 1 }),
        Admin.db.list("newsletters", { count: "exact", limit: 1 }),
        Admin.db.list("admin_audit", { count: "exact", limit: 1,
          gte: ["created_at", new Date(Date.now() - 7 * 86400e3).toISOString()] }),
      ]).then(([u, n, i, nl, a]) => {
        const m = {
          cUsers: u, cNiches: n, cItems: i, cNews: nl, cAudit: a,
        };
        Object.entries(m).forEach(([id, r]) => {
          const el = document.getElementById(id);
          el.textContent = r.status === "fulfilled" ? (r.value.count ?? "—") : "—";
        });
      });

      return () => { container.innerHTML = ""; };
    },
  });
})();
