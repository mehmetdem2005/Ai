(function () {
  const Admin = window.Admin;
  if (!Admin) return;

  const STATUS_TONE = { pending: "warn", published: "ok", rejected: "err" };

  Admin.register("articles", {
    mount(section, ctx) {
      const ph = section.querySelector(".card.placeholder");
      if (ph) ph.remove();
      const head = section.querySelector(".page-head");
      const container = document.createElement("div");
      head.after(container);

      const filterState = { status: "pending", source: "", q: "" };

      const filterEl = Admin.filter({
        initial: filterState,
        fields: [
          { name: "status", label: "Durum", type: "select", options: [
            { value: "", label: "Tümü" },
            { value: "pending", label: "Onay bekliyor" },
            { value: "published", label: "Yayında" },
            { value: "rejected", label: "Reddedildi" },
          ]},
          { name: "source", label: "Kaynak", type: "search", placeholder: "kaynak adı…" },
          { name: "q", label: "Ara", type: "search", placeholder: "başlık…" },
        ],
        onChange(next) { Object.assign(filterState, { status: "", source: "", q: "" }, next); load(); },
      });
      container.appendChild(filterEl.el);

      const tableHost = document.createElement("div");
      container.appendChild(tableHost);

      async function load() {
        Admin.state.render(tableHost, { loading: true });
        try {
          const opts = {
            select: "id_hash, title, title_tr, source, status, impact_score, category, processed_at",
            order: { col: "processed_at", asc: false },
            limit: 200, eq: [],
          };
          if (filterState.status) opts.eq.push(["status", filterState.status]);
          if (filterState.source) opts.like = (opts.like || []).concat([["source", `%${filterState.source}%`]]);
          if (filterState.q) {
            opts.like = (opts.like || []).concat([["title", `%${filterState.q}%`]]);
          }
          const { data } = await Admin.db.list("articles", opts);
          renderTable(data);
        } catch (e) {
          Admin.state.render(tableHost, { error: e, retry: load });
        }
      }

      function renderTable(rows) {
        tableHost.innerHTML = "";
        const t = Admin.table({
          idKey: "id_hash",
          selectable: Admin.db.can("articles.write"),
          bulkActions: Admin.db.can("articles.write") ? [
            { label: "Yayınla", tone: "primary", onClick: (ids) => bulkStatus(ids, "published") },
            { label: "Reddet", tone: "danger", onClick: (ids) => bulkStatus(ids, "rejected") },
          ] : [],
          columns: [
            { key: "title", label: "Başlık", render: (r) => {
              const t = r.title_tr || r.title || "—";
              return `<div style="line-height:1.35">
                <div style="font-weight:500">${Admin.escapeHtml(t.length > 100 ? t.slice(0, 97) + "…" : t)}</div>
                <div style="font-size:11.5px;color:var(--mid);font-family:var(--font-mono);margin-top:2px">${Admin.escapeHtml(r.source || "—")} · ${r.category || "—"}</div>
              </div>`;
            }},
            { key: "status", label: "Durum", width: "110px", render: (r) =>
              Admin.badgeHTML(r.status, STATUS_TONE[r.status]) },
            { key: "impact_score", label: "Etki", width: "60px", align: "center", render: (r) =>
              r.impact_score != null ? `<span style="font-family:var(--font-mono);font-size:12px">${r.impact_score.toFixed(1)}</span>` : "—" },
            { key: "processed_at", label: "İşlendi", width: "140px", render: (r) =>
              `<span style="font-family:var(--font-mono);font-size:11.5px;color:var(--mid)">${r.processed_at ? new Date(r.processed_at).toLocaleString("tr-TR") : "—"}</span>` },
          ],
          rowClick(row) { openDetail(row); },
        });
        tableHost.appendChild(t.el);
        if (rows.length === 0) {
          Admin.state.render(tableHost, { empty: true,
            emptyText: filterState.status ? `'${filterState.status}' durumunda makale yok` : "Henüz makale yok" });
        } else t.render(rows);
      }

      async function bulkStatus(ids, status) {
        const ok = await Admin.modal.confirm({
          title: "Toplu durum değişimi",
          message: `${ids.length} makale '${status}' yapılacak.`,
          okLabel: "Onayla",
        });
        if (!ok) return;
        try {
          await Promise.all(ids.map((id) => Admin.db.setArticleStatus(id, status)));
          Admin.toast.ok(`${ids.length} makale güncellendi`);
          load();
        } catch (e) {
          Admin.toast.err(e.message);
        }
      }

      async function openDetail(row) {
        const tabs = [
          {
            id: "overview", label: "Özet",
            render: () => {
              const div = document.createElement("div");
              div.innerHTML = `
                <h3 style="margin:0 0 8px;font-size:16px">${Admin.escapeHtml(row.title_tr || row.title)}</h3>
                ${row.title_tr && row.title ? `<div style="font-size:13px;color:var(--mid);font-style:italic;margin-bottom:14px">${Admin.escapeHtml(row.title)}</div>` : ""}
                <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;font-size:13px">
                  <div style="color:var(--mid)">Kaynak</div><div>${Admin.escapeHtml(row.source || "—")}</div>
                  <div style="color:var(--mid)">Kategori</div><div>${Admin.escapeHtml(row.category || "—")}</div>
                  <div style="color:var(--mid)">Etki skoru</div><div>${row.impact_score ?? "—"}</div>
                  <div style="color:var(--mid)">Durum</div><div>${Admin.badgeHTML(row.status, STATUS_TONE[row.status])}</div>
                  <div style="color:var(--mid)">İşlendi</div><div>${row.processed_at ? new Date(row.processed_at).toLocaleString("tr-TR") : "—"}</div>
                </div>
              `;
              return div;
            },
          },
          {
            id: "content", label: "İçerik",
            render: async () => {
              const div = document.createElement("div");
              Admin.state.render(div, { loading: true });
              try {
                const full = await Admin.db.get("articles", "id_hash", row.id_hash);
                div.innerHTML = `
                  ${full.link ? `<div style="margin-bottom:12px"><a href="${Admin.escapeHtml(full.link)}" target="_blank" rel="noopener noreferrer">${Admin.escapeHtml(full.link)} ↗</a></div>` : ""}
                  ${full.summary ? `<h4 style="margin:14px 0 6px;font-size:13px">Özet</h4><p style="font-size:14px;line-height:1.55">${Admin.escapeHtml(full.summary)}</p>` : ""}
                  ${full.ai_insight ? `<h4 style="margin:18px 0 6px;font-size:13px">AI içgörüsü</h4><p style="font-size:14px;line-height:1.55;color:var(--ink-2)">${Admin.escapeHtml(full.ai_insight)}</p>` : ""}
                `;
              } catch (e) {
                Admin.state.render(div, { error: e });
              }
              return div;
            },
          },
          {
            id: "activity", label: "Aktivite",
            render: async () => {
              const div = document.createElement("div");
              Admin.state.render(div, { loading: true });
              try {
                const { data } = await Admin.db.list("admin_audit", {
                  eq: [["entity_table", "articles"], ["entity_id", row.id_hash]],
                  order: { col: "created_at", asc: false }, limit: 50,
                });
                if (data.length === 0) {
                  Admin.state.render(div, { empty: true, emptyText: "Bu makale için audit kaydı yok" });
                  return null;
                }
                div.innerHTML = `<ul class="activity-list">` + data.map((r) =>
                  `<li><span style="font-family:var(--font-mono);font-size:11.5px;color:var(--mid)">${new Date(r.created_at).toLocaleString("tr-TR")}</span>
                       ${Admin.badgeHTML(r.op, "info")}
                       <span style="font-size:13px">${Admin.escapeHtml(r.actor_email || "system")}</span>
                       ${r.meta?.new_status ? `<span style="font-size:12.5px;color:var(--mid)"> → ${Admin.escapeHtml(r.meta.new_status)}</span>` : ""}
                  </li>`
                ).join("") + `</ul>`;
              } catch (e) {
                Admin.state.render(div, { error: e });
              }
              return div;
            },
          },
        ];

        const actions = [];
        if (Admin.db.can("articles.write")) {
          ["pending","published","rejected"].forEach((s) => {
            if (s !== row.status) {
              actions.push({ label: s === "published" ? "Yayınla" : s === "rejected" ? "Reddet" : "Bekletmeye al",
                tone: s === "published" ? "primary" : s === "rejected" ? "danger" : "",
                onClick: async ({close}) => {
                  await Admin.db.setArticleStatus(row.id_hash, s);
                  Admin.toast.ok(`Durum → ${s}`);
                  close(); load();
                }});
            }
          });
        }

        const detail = Admin.detail({
          title: row.title_tr || row.title,
          subtitle: row.id_hash,
          badges: [{ text: row.status, tone: STATUS_TONE[row.status] }],
          tabs,
        });
        Admin.modal.open({ title: "Makale", size: "xl", body: detail.el, actions });
      }

      load();
      const handler = () => load();
      document.addEventListener("admin:audit", handler);
      return () => { document.removeEventListener("admin:audit", handler); container.innerHTML = ""; };
    },
  });

  const style = document.createElement("style");
  style.textContent = `
    .activity-list { list-style: none; padding: 0; margin: 0; }
    .activity-list li {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 0; border-bottom: 1px solid var(--line-2);
    }
    .activity-list li:last-child { border-bottom: none; }
  `;
  document.head.appendChild(style);
})();
