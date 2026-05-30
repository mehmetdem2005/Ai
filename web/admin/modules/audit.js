(function () {
  const Admin = window.Admin;
  if (!Admin) return;

  const OP_TONE = {
    insert: "ok", update: "info", delete: "err",
    "article.status_change": "info",
    "iam.role_change": "warn",
    "cms.write": "info",
    login: "mute", dispatch: "info",
  };

  Admin.register("audit", {
    mount(section, ctx) {
      const ph = section.querySelector(".card.placeholder");
      if (ph) ph.remove();
      const head = section.querySelector(".page-head");
      const container = document.createElement("div");
      head.after(container);

      const filterState = { table: "", op: "", q: "" };
      const filterEl = Admin.filter({
        fields: [
          { name: "table", label: "Tablo", type: "select", options: [
            { value: "", label: "Tümü" },
            { value: "articles", label: "Articles" },
            { value: "feeds", label: "Feeds" },
            { value: "site_strings", label: "Site strings" },
            { value: "site_pages", label: "Site pages" },
            { value: "admin_users", label: "Admin users" },
          ]},
          { name: "op", label: "Aksiyon", type: "select", options: [
            { value: "", label: "Tümü" },
            { value: "insert", label: "insert" },
            { value: "update", label: "update" },
            { value: "delete", label: "delete" },
            { value: "article.status_change", label: "article.status" },
            { value: "iam.role_change", label: "role change" },
          ]},
          { name: "q", label: "Ara", type: "search", placeholder: "actor email veya entity_id…" },
        ],
        onChange(next) { Object.assign(filterState, next); load(); },
      });
      container.appendChild(filterEl.el);

      const tableContainer = document.createElement("div");
      container.appendChild(tableContainer);

      const table = Admin.table({
        columns: [
          { key: "created_at", label: "Zaman", width: "140px", render: (r) => {
            const d = new Date(r.created_at);
            return `<span style="font-family:var(--font-mono);font-size:12px;color:var(--mid)">${d.toLocaleString("tr-TR")}</span>`;
          }},
          { key: "actor_email", label: "Kim", width: "200px", render: (r) =>
            Admin.escapeHtml(r.actor_email || "—") },
          { key: "op", label: "Aksiyon", width: "180px", render: (r) =>
            Admin.badgeHTML(r.op, OP_TONE[r.op] || "mute") },
          { key: "entity_table", label: "Tablo", width: "120px", render: (r) =>
            `<span style="font-family:var(--font-mono);font-size:12px">${Admin.escapeHtml(r.entity_table)}</span>` },
          { key: "entity_id", label: "Entity", render: (r) =>
            `<span style="font-family:var(--font-mono);font-size:12px;color:var(--ink-2)">${Admin.escapeHtml((r.entity_id || "").slice(0, 24))}</span>` },
        ],
        rowClick(row) { openDetail(row); },
      });
      tableContainer.appendChild(table.el);

      let unsub = null;
      async function load() {
        Admin.state.render(tableContainer, { loading: true });
        try {
          const opts = {
            select: "id, created_at, actor_id, actor_email, op, entity_table, entity_id, before, after, meta",
            order: { col: "created_at", asc: false },
            limit: 200,
            eq: [],
          };
          if (filterState.table) opts.eq.push(["entity_table", filterState.table]);
          if (filterState.op) opts.eq.push(["op", filterState.op]);
          if (filterState.q) opts.like = [["actor_email", `%${filterState.q}%`]];
          const { data } = await Admin.db.list("admin_audit", opts);
          tableContainer.innerHTML = "";
          tableContainer.appendChild(table.el);
          if (data.length === 0) {
            Admin.state.render(tableContainer, { empty: true, emptyText: "Henüz audit kaydı yok",
              emptySub: "Mutation gerçekleştikçe burada görünür." });
            return;
          }
          table.render(data);
        } catch (e) {
          Admin.state.render(tableContainer, { error: e, retry: load });
        }
      }
      load();

      // hot-refresh
      const handler = () => load();
      document.addEventListener("admin:audit", handler);
      unsub = () => document.removeEventListener("admin:audit", handler);

      function openDetail(row) {
        const body = document.createElement("div");
        body.innerHTML = `
          <div style="font-family:var(--font-mono);font-size:12px;color:var(--mid);margin-bottom:10px">
            ${new Date(row.created_at).toLocaleString("tr-TR")} ·
            ${Admin.escapeHtml(row.actor_email || "—")} ·
            ${Admin.badgeHTML(row.op, OP_TONE[row.op] || "mute")}
          </div>
          <div style="font-size:13px;margin-bottom:14px">
            <strong>${Admin.escapeHtml(row.entity_table)}</strong>
            ${row.entity_id ? ` / <code>${Admin.escapeHtml(row.entity_id)}</code>` : ""}
          </div>
          ${row.before ? `<details open><summary>Önce</summary><pre class="audit-json">${Admin.escapeHtml(JSON.stringify(row.before, null, 2))}</pre></details>` : ""}
          ${row.after ? `<details open><summary>Sonra</summary><pre class="audit-json">${Admin.escapeHtml(JSON.stringify(row.after, null, 2))}</pre></details>` : ""}
          ${row.meta ? `<details><summary>Meta</summary><pre class="audit-json">${Admin.escapeHtml(JSON.stringify(row.meta, null, 2))}</pre></details>` : ""}
        `;
        Admin.modal.open({ title: "Audit kaydı", size: "lg", body,
          actions: [{ label: "Kapat", onClick: ({close}) => close() }] });
      }

      return () => { if (unsub) unsub(); };
    },
  });

  // Stil için küçük ek
  const style = document.createElement("style");
  style.textContent = `
    .audit-json {
      background: var(--bg-2);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 10px 12px;
      font-family: var(--font-mono);
      font-size: 11.5px; line-height: 1.55;
      color: var(--ink-2);
      max-height: 280px; overflow: auto;
      white-space: pre-wrap; word-break: break-word;
    }
    details + details { margin-top: 10px; }
    summary { font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 4px 0; }
  `;
  document.head.appendChild(style);
})();
