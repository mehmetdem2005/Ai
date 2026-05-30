(function () {
  const Admin = window.Admin;
  if (!Admin) return;

  Admin.register("newsletters", {
    mount(section, ctx) {
      const ph = section.querySelector(".card.placeholder");
      if (ph) ph.remove();
      const head = section.querySelector(".page-head");
      const container = document.createElement("div");
      head.after(container);

      const tableHost = document.createElement("div");
      container.appendChild(tableHost);

      async function load() {
        Admin.state.render(tableHost, { loading: true });
        try {
          const { data } = await Admin.db.list("newsletters", {
            select: "id, filename, article_count, created_at",
            order: { col: "created_at", asc: false },
            limit: 200,
          });
          renderTable(data);
        } catch (e) {
          Admin.state.render(tableHost, { error: e, retry: load });
        }
      }

      function renderTable(rows) {
        tableHost.innerHTML = "";
        const t = Admin.table({
          columns: [
            { key: "filename", label: "Dosya", render: (r) =>
              `<code style="font-family:var(--font-mono);font-size:12px">${Admin.escapeHtml(r.filename || "—")}</code>` },
            { key: "article_count", label: "Makale", width: "80px", align: "center", render: (r) =>
              `<span style="font-family:var(--font-mono);font-size:13px">${r.article_count ?? "—"}</span>` },
            { key: "created_at", label: "Yayımlandı", width: "180px", render: (r) =>
              `<span style="font-family:var(--font-mono);font-size:12px">${new Date(r.created_at).toLocaleString("tr-TR")}</span>` },
            { key: "_a", label: "", width: "120px", align: "right", render: (r) => {
              const a = document.createElement("a");
              a.className = "btn ghost";
              a.textContent = "Aç ↗";
              a.href = `/b/${r.id}`;
              a.target = "_blank";
              a.rel = "noopener noreferrer";
              return a;
            }},
          ],
          rowClick(row) { openDetail(row); },
        });
        tableHost.appendChild(t.el);
        if (rows.length === 0) {
          Admin.state.render(tableHost, { empty: true,
            emptyText: "Henüz bülten yok",
            emptySub: "Pipeline ilk bülteni üretince burada görünür." });
        } else t.render(rows);
      }

      async function openDetail(row) {
        const body = document.createElement("div");
        Admin.state.render(body, { loading: true });
        Admin.modal.open({ title: row.filename || `Bülten #${row.id}`, size: "xl", body,
          actions: [{ label: "Public sayfa ↗", onClick: () => window.open(`/b/${row.id}`, "_blank") },
                    { label: "Kapat", onClick: ({close}) => close() }] });
        try {
          const full = await Admin.db.get("newsletters", "id", row.id, "id, filename, article_count, content, created_at");
          body.innerHTML = `
            <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;font-size:13px;margin-bottom:14px">
              <div style="color:var(--mid)">Dosya</div><div><code>${Admin.escapeHtml(full.filename || "—")}</code></div>
              <div style="color:var(--mid)">Makale sayısı</div><div>${full.article_count ?? "—"}</div>
              <div style="color:var(--mid)">Tarih</div><div>${new Date(full.created_at).toLocaleString("tr-TR")}</div>
            </div>
            <h4 style="margin:14px 0 6px;font-size:13px">İçerik</h4>
            <pre style="background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;font-family:var(--font-mono);font-size:12px;line-height:1.6;max-height:420px;overflow:auto;white-space:pre-wrap">${Admin.escapeHtml(full.content || "")}</pre>
          `;
        } catch (e) {
          Admin.state.render(body, { error: e });
        }
      }

      load();
      return () => { container.innerHTML = ""; };
    },
  });
})();
