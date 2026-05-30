(function () {
  const Admin = window.Admin;
  if (!Admin) return;

  const PLAN_TONE = { free: "mute", pro: "ok" };

  Admin.register("users", {
    mount(section, ctx) {
      const ph = section.querySelector(".card.placeholder");
      if (ph) ph.remove();
      const head = section.querySelector(".page-head");
      const container = document.createElement("div");
      head.after(container);

      const filterState = { plan: "", q: "" };
      const filterEl = Admin.filter({
        fields: [
          { name: "plan", label: "Plan", type: "select", options: [
            { value: "", label: "Tümü" }, { value: "pro", label: "Pro" }, { value: "free", label: "Free" },
          ]},
          { name: "q", label: "Ara", type: "search", placeholder: "email veya isim…" },
        ],
        onChange(next) { Object.assign(filterState, { plan: "", q: "" }, next); load(); },
      });
      container.appendChild(filterEl.el);

      const tableHost = document.createElement("div");
      container.appendChild(tableHost);

      async function load() {
        Admin.state.render(tableHost, { loading: true });
        try {
          const opts = {
            select: "id, email, full_name, specialty, plan, locale, created_at",
            order: { col: "created_at", asc: false },
            limit: 200, eq: [],
          };
          if (filterState.plan) opts.eq.push(["plan", filterState.plan]);
          if (filterState.q) {
            opts.like = [["email", `%${filterState.q}%`]];
          }
          const { data } = await Admin.db.list("profiles", opts);
          renderTable(data);
        } catch (e) {
          Admin.state.render(tableHost, { error: e, retry: load });
        }
      }

      function renderTable(rows) {
        tableHost.innerHTML = "";
        const t = Admin.table({
          columns: [
            { key: "email", label: "Kullanıcı", render: (r) => `
              <div style="line-height:1.35">
                <div style="font-weight:500">${Admin.escapeHtml(r.full_name || r.email || "—")}</div>
                <div style="font-size:11.5px;color:var(--mid);font-family:var(--font-mono)">${Admin.escapeHtml(r.email || "")}</div>
              </div>
            `},
            { key: "specialty", label: "Uzmanlık", render: (r) => Admin.escapeHtml(r.specialty || "—") },
            { key: "plan", label: "Plan", width: "70px", render: (r) =>
              Admin.badgeHTML(r.plan || "free", PLAN_TONE[r.plan] || "mute") },
            { key: "locale", label: "Dil", width: "60px", align: "center", render: (r) =>
              `<span style="font-family:var(--font-mono);font-size:12px">${(r.locale || "tr").slice(0, 2)}</span>` },
            { key: "created_at", label: "Üyelik", width: "120px", render: (r) =>
              `<span style="font-family:var(--font-mono);font-size:11.5px;color:var(--mid)">${new Date(r.created_at).toLocaleDateString("tr-TR")}</span>` },
          ],
          rowClick(row) { openDetail(row); },
        });
        tableHost.appendChild(t.el);
        if (rows.length === 0) {
          Admin.state.render(tableHost, { empty: true, emptyText: "Eşleşen kullanıcı yok" });
        } else t.render(rows);
      }

      async function openDetail(row) {
        const tabs = [
          { id: "overview", label: "Profil", render: () => {
            const div = document.createElement("div");
            div.innerHTML = `
              <div style="display:grid;grid-template-columns:140px 1fr;gap:8px;font-size:13.5px">
                <div style="color:var(--mid)">Email</div><div style="font-family:var(--font-mono);font-size:13px">${Admin.escapeHtml(row.email || "—")}</div>
                <div style="color:var(--mid)">Ad</div><div>${Admin.escapeHtml(row.full_name || "—")}</div>
                <div style="color:var(--mid)">Uzmanlık</div><div>${Admin.escapeHtml(row.specialty || "—")}</div>
                <div style="color:var(--mid)">Plan</div><div>${Admin.badgeHTML(row.plan || "free", PLAN_TONE[row.plan] || "mute")}</div>
                <div style="color:var(--mid)">Dil</div><div>${Admin.escapeHtml(row.locale || "tr")}</div>
                <div style="color:var(--mid)">Üyelik</div><div>${new Date(row.created_at).toLocaleString("tr-TR")}</div>
                <div style="color:var(--mid)">User ID</div><div style="font-family:var(--font-mono);font-size:11.5px">${row.id}</div>
              </div>
            `;
            return div;
          }},
          { id: "niches", label: "Niche'leri", render: async () => {
            const div = document.createElement("div");
            Admin.state.render(div, { loading: true });
            try {
              const { data } = await Admin.db.list("niches", {
                eq: [["user_id", row.id]],
                order: { col: "created_at", asc: false }, select: "id, label, description, threshold, is_active, created_at",
              });
              if (!data.length) {
                Admin.state.render(div, { empty: true, emptyText: "Bu kullanıcı henüz niche tanımlamamış" });
                return null;
              }
              div.innerHTML = `<div class="niches-list">` + data.map((n) => `
                <div class="niche-row">
                  <div style="flex:1">
                    <div style="font-weight:500">${Admin.escapeHtml(n.label)}</div>
                    <div style="font-size:12.5px;color:var(--mid);margin-top:2px">${Admin.escapeHtml((n.description || "").slice(0, 160))}${(n.description || "").length > 160 ? "…" : ""}</div>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
                    <span style="font-family:var(--font-mono);font-size:11px;color:var(--mid)">eş. ${n.threshold || "0.70"}</span>
                    ${Admin.badgeHTML(n.is_active ? "active" : "inactive", n.is_active ? "ok" : "mute")}
                  </div>
                </div>
              `).join("") + `</div>`;
            } catch (e) {
              Admin.state.render(div, { error: e });
            }
            return div;
          }},
          { id: "briefs", label: "Son brief'ler", render: async () => {
            const div = document.createElement("div");
            Admin.state.render(div, { loading: true });
            try {
              const since = new Date(Date.now() - 30 * 86400e3).toISOString();
              const { data } = await Admin.db.list("briefs", {
                eq: [["user_id", row.id]],
                gte: ["created_at", since],
                order: { col: "brief_date", asc: false },
                select: "id, brief_date, status, item_count, delivered_at, created_at",
              });
              if (!data.length) {
                Admin.state.render(div, { empty: true, emptyText: "Son 30 günde brief yok" });
                return null;
              }
              div.innerHTML = `
                <table class="tbl tbl-dense" style="margin-top:4px">
                  <thead><tr><th>Tarih</th><th>Durum</th><th style="text-align:center">Item</th><th>Teslim</th></tr></thead>
                  <tbody>${data.map((b) => `
                    <tr>
                      <td>${b.brief_date}</td>
                      <td>${Admin.badgeHTML(b.status)}</td>
                      <td style="text-align:center;font-family:var(--font-mono)">${b.item_count}</td>
                      <td style="font-family:var(--font-mono);font-size:11.5px;color:var(--mid)">${b.delivered_at ? new Date(b.delivered_at).toLocaleString("tr-TR") : "—"}</td>
                    </tr>`).join("")}</tbody></table>`;
            } catch (e) { Admin.state.render(div, { error: e }); }
            return div;
          }},
        ];

        const detail = Admin.detail({
          title: row.full_name || row.email || "—",
          subtitle: row.email,
          badges: [{ text: row.plan || "free", tone: PLAN_TONE[row.plan] || "mute" }],
          tabs,
        });
        Admin.modal.open({ title: "Pro kullanıcı", size: "xl", body: detail.el,
          actions: [{ label: "Kapat", onClick: ({close}) => close() }] });
      }

      load();
      return () => { container.innerHTML = ""; };
    },
  });

  const style = document.createElement("style");
  style.textContent = `
    .niches-list { display: flex; flex-direction: column; gap: 8px; }
    .niche-row {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 12px 14px;
      background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--radius);
    }
  `;
  document.head.appendChild(style);
})();
