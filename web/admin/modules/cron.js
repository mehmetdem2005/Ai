(function () {
  const Admin = window.Admin;
  if (!Admin) return;

  const STATUS_TONE = {
    queued: "warn", in_progress: "warn",
    success: "ok", failure: "err", cancelled: "mute", timeout: "err",
  };

  const WORKFLOWS = [
    { id: "sovereign-daily.yml", label: "Sovereign günlük (Pro brief üretimi)" },
    { id: "bulletin.yml", label: "Bülten (eski public)" },
  ];

  Admin.register("cron", {
    mount(section, ctx) {
      const ph = section.querySelector(".card.placeholder");
      if (ph) ph.remove();
      const head = section.querySelector(".page-head");
      const container = document.createElement("div");
      head.after(container);

      const headRow = document.createElement("div");
      headRow.className = "page-head-row";
      headRow.innerHTML = `
        <div></div>
        <div class="page-head-actions"></div>
      `;
      const actions = headRow.querySelector(".page-head-actions");
      if (Admin.db.can("cron.dispatch")) {
        const triggerBtn = document.createElement("button");
        triggerBtn.className = "btn primary";
        triggerBtn.textContent = "Manuel tetik";
        triggerBtn.onclick = openDispatchModal;
        actions.appendChild(triggerBtn);
      }
      container.appendChild(headRow);

      const tableHost = document.createElement("div");
      container.appendChild(tableHost);

      async function load() {
        Admin.state.render(tableHost, { loading: true });
        try {
          const { data } = await Admin.db.list("cron_runs", {
            order: { col: "created_at", asc: false },
            limit: 100,
            select: "id, workflow, github_run_id, status, trigger_source, started_at, finished_at, inputs, summary, error, created_at",
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
            { key: "workflow", label: "Workflow", render: (r) =>
              `<code style="font-family:var(--font-mono);font-size:12px">${Admin.escapeHtml(r.workflow)}</code>` },
            { key: "status", label: "Durum", width: "100px", render: (r) =>
              Admin.badgeHTML(r.status, STATUS_TONE[r.status]) },
            { key: "trigger_source", label: "Kaynak", width: "90px", render: (r) =>
              Admin.badgeHTML(r.trigger_source, r.trigger_source === "manual" ? "info" : "mute") },
            { key: "duration", label: "Süre", width: "80px", align: "right", render: (r) => {
              if (!r.started_at) return "—";
              const end = r.finished_at ? new Date(r.finished_at) : new Date();
              const sec = Math.round((end - new Date(r.started_at)) / 1000);
              return `<span style="font-family:var(--font-mono);font-size:12px">${sec}s</span>`;
            }},
            { key: "created_at", label: "Başladı", width: "160px", render: (r) =>
              `<span style="font-family:var(--font-mono);font-size:11.5px;color:var(--mid)">${new Date(r.created_at).toLocaleString("tr-TR")}</span>` },
          ],
          rowClick(row) { openDetail(row); },
        });
        tableHost.appendChild(t.el);
        if (rows.length === 0) {
          Admin.state.render(tableHost, {
            empty: true, emptyText: "Henüz cron çalıştırması yok",
            emptySub: "Workflow her tetiklendiğinde burada kayıt oluşur.",
            action: Admin.db.can("cron.dispatch") ? { label: "Manuel tetik", onClick: openDispatchModal } : null,
          });
        } else t.render(rows);
      }

      function openDispatchModal() {
        const body = document.createElement("div");
        const form = Admin.form({
          initial: { workflow: WORKFLOWS[0].id, ref: "main" },
          fields: [
            { name: "workflow", label: "Workflow", type: "select",
              options: WORKFLOWS.map((w) => ({ value: w.id, label: w.label })) },
            { name: "ref", label: "Branch / ref", type: "text", required: true,
              help: "Genelde 'main'." },
          ],
          submitLabel: "Tetikle",
          onCancel: () => Admin.modal.close(back),
          async onSubmit(values) {
            const { data: { session } } = await Admin.db.sb.auth.getSession();
            const r = await fetch("/api/admin/dispatch", {
              method: "POST",
              headers: { Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
              body: JSON.stringify({ workflow: values.workflow, ref: values.ref }),
            });
            const out = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(out.error || `HTTP ${r.status}`);
            Admin.toast.ok(out.message || "Tetiklendi");
            Admin.modal.close(back);
            setTimeout(load, 1500);
          },
        });
        body.appendChild(form.el);
        const back = Admin.modal.open({ title: "Workflow tetikle", body });
      }

      async function openDetail(row) {
        const body = document.createElement("div");
        body.innerHTML = `
          <div style="display:grid;grid-template-columns:140px 1fr;gap:8px;font-size:13.5px;margin-bottom:14px">
            <div style="color:var(--mid)">Workflow</div><div><code>${Admin.escapeHtml(row.workflow)}</code></div>
            <div style="color:var(--mid)">Durum</div><div>${Admin.badgeHTML(row.status, STATUS_TONE[row.status])}</div>
            <div style="color:var(--mid)">Kaynak</div><div>${Admin.escapeHtml(row.trigger_source || "—")}</div>
            <div style="color:var(--mid)">GitHub run</div><div>${row.github_run_id ? `<a href="https://github.com/mehmetdem2005/Ai/actions/runs/${row.github_run_id}" target="_blank" rel="noopener noreferrer">#${row.github_run_id} ↗</a>` : "—"}</div>
            <div style="color:var(--mid)">Başlangıç</div><div>${row.started_at ? new Date(row.started_at).toLocaleString("tr-TR") : "—"}</div>
            <div style="color:var(--mid)">Bitiş</div><div>${row.finished_at ? new Date(row.finished_at).toLocaleString("tr-TR") : "—"}</div>
          </div>
          ${row.inputs ? `<h4 style="margin:12px 0 6px;font-size:13px">Inputs</h4><pre class="audit-json">${Admin.escapeHtml(JSON.stringify(row.inputs, null, 2))}</pre>` : ""}
          ${row.summary ? `<h4 style="margin:12px 0 6px;font-size:13px">Özet</h4><pre class="audit-json">${Admin.escapeHtml(JSON.stringify(row.summary, null, 2))}</pre>` : ""}
          ${row.error ? `<h4 style="margin:12px 0 6px;font-size:13px;color:#cf222e">Hata</h4><pre class="audit-json" style="color:#cf222e">${Admin.escapeHtml(row.error)}</pre>` : ""}
        `;
        Admin.modal.open({ title: `Run #${row.id}`, size: "lg", body,
          actions: [{ label: "Kapat", onClick: ({close}) => close() }] });
      }

      load();
      // Auto-refresh: 30 saniyede bir yenile (queued/in_progress varsa daha sık)
      const interval = setInterval(load, 30000);
      return () => { clearInterval(interval); container.innerHTML = ""; };
    },
  });
})();
