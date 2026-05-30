(function () {
  const Admin = window.Admin;
  if (!Admin) return;

  Admin.register("sources", {
    mount(section, ctx) {
      const ph = section.querySelector(".card.placeholder");
      if (ph) ph.remove();
      const head = section.querySelector(".page-head");
      const container = document.createElement("div");
      head.after(container);

      const headRow = document.createElement("div");
      headRow.className = "page-head-row";
      headRow.innerHTML = `<div></div><div class="page-head-actions"></div>`;
      if (Admin.db.can("feeds.write")) {
        const add = document.createElement("button");
        add.className = "btn primary";
        add.textContent = "Yeni kaynak";
        add.onclick = () => openEditor(null);
        headRow.querySelector(".page-head-actions").appendChild(add);
      }
      container.appendChild(headRow);

      const filterState = { active: "", q: "" };
      const filterEl = Admin.filter({
        fields: [
          { name: "active", label: "Durum", type: "select", options: [
            { value: "", label: "Tümü" },
            { value: "true", label: "Aktif" },
            { value: "false", label: "Pasif" },
          ]},
          { name: "q", label: "Ara", type: "search", placeholder: "isim veya URL…" },
        ],
        onChange(next) { Object.assign(filterState, next); load(); },
      });
      container.appendChild(filterEl.el);

      const tableHost = document.createElement("div");
      container.appendChild(tableHost);

      async function load() {
        Admin.state.render(tableHost, { loading: true });
        try {
          const opts = { order: { col: "name", asc: true }, eq: [] };
          if (filterState.active === "true") opts.eq.push(["active", true]);
          if (filterState.active === "false") opts.eq.push(["active", false]);
          const { data } = await Admin.db.list("feeds", opts);
          let rows = data;
          if (filterState.q) {
            const q = filterState.q.toLowerCase();
            rows = rows.filter((r) => (r.name || "").toLowerCase().includes(q) || (r.url || "").toLowerCase().includes(q));
          }
          renderTable(rows);
        } catch (e) {
          Admin.state.render(tableHost, { error: e, retry: load });
        }
      }

      function renderTable(rows) {
        tableHost.innerHTML = "";
        const t = Admin.table({
          columns: [
            { key: "name", label: "İsim", render: (r) => `<strong>${Admin.escapeHtml(r.name)}</strong>` },
            { key: "url", label: "URL", render: (r) =>
              `<a href="${Admin.escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer" style="font-family:var(--font-mono);font-size:12px;color:var(--cyan-ink)">${Admin.escapeHtml(r.url.length > 60 ? r.url.slice(0, 57) + "…" : r.url)}</a>` },
            { key: "active", label: "Durum", width: "90px", render: (r) =>
              Admin.badgeHTML(r.active ? "active" : "inactive", r.active ? "ok" : "mute") },
            { key: "created_at", label: "Eklendi", width: "120px", render: (r) =>
              `<span style="font-family:var(--font-mono);font-size:11.5px;color:var(--mid)">${new Date(r.created_at).toLocaleDateString("tr-TR")}</span>` },
            { key: "_a", label: "", width: "180px", align: "right", render: (r) => {
              const wrap = document.createElement("div");
              wrap.style.display = "flex"; wrap.style.gap = "6px"; wrap.style.justifyContent = "flex-end";
              if (Admin.db.can("feeds.write")) {
                const toggle = document.createElement("button");
                toggle.className = "btn ghost";
                toggle.textContent = r.active ? "Devre dışı bırak" : "Etkinleştir";
                toggle.onclick = (e) => { e.stopPropagation(); toggleActive(r); };
                wrap.appendChild(toggle);
              }
              const edit = document.createElement("button");
              edit.className = "btn ghost";
              edit.textContent = "Düzenle";
              edit.onclick = (e) => { e.stopPropagation(); openEditor(r); };
              wrap.appendChild(edit);
              return wrap;
            }},
          ],
          rowClick(row) { openEditor(row); },
        });
        tableHost.appendChild(t.el);
        if (rows.length === 0) {
          Admin.state.render(tableHost, {
            empty: true, emptyText: "Henüz kaynak yok",
            emptySub: "İlk RSS feed'i ekleyerek pipeline'a girdi sağla.",
            action: Admin.db.can("feeds.write") ? { label: "Yeni kaynak", onClick: () => openEditor(null) } : null,
          });
        } else t.render(rows);
      }

      async function toggleActive(row) {
        const payload = { id: row.id, name: row.name, url: row.url, active: !row.active };
        try {
          await Admin.db.rpc("admin_upsert", { p_table: "feeds", p_row: payload, p_key: "id" });
          document.dispatchEvent(new CustomEvent("admin:audit", { detail: { table: "feeds", op: "toggle" } }));
          Admin.toast.ok(payload.active ? "Etkinleştirildi" : "Devre dışı bırakıldı");
          load();
        } catch (e) {
          Admin.toast.err(e.message);
        }
      }

      function openEditor(row) {
        const isNew = !row;
        const body = document.createElement("div");
        const form = Admin.form({
          initial: row || { name: "", url: "", active: true },
          fields: [
            { name: "name", label: "İsim", type: "text", required: true,
              validate: (v) => v.trim().length < 2 ? "En az 2 karakter" : null },
            { name: "url", label: "RSS URL", type: "text", required: true,
              placeholder: "https://example.com/feed.xml",
              validate: (v) => /^https?:\/\//.test(v) ? null : "http(s):// ile başlamalı" },
            { name: "active", label: "Aktif", type: "toggle", help: "Pipeline bu kaynağı taramaya dahil etsin mi?" },
          ],
          submitLabel: isNew ? "Ekle" : "Kaydet",
          onCancel: () => Admin.modal.close(back),
          async onSubmit(values) {
            const payload = { name: values.name.trim(), url: values.url.trim(), active: !!values.active };
            if (row && row.id) payload.id = row.id;
            await Admin.db.rpc("admin_upsert", { p_table: "feeds", p_row: payload, p_key: "id" });
            document.dispatchEvent(new CustomEvent("admin:audit", { detail: { table: "feeds" } }));
            Admin.toast.ok(isNew ? "Eklendi" : "Güncellendi");
            Admin.modal.close(back);
            load();
          },
        });
        body.appendChild(form.el);
        const actions = [];
        if (!isNew && Admin.db.can("feeds.write")) {
          actions.push({ label: "Sil", tone: "danger", onClick: async ({close}) => {
            const ok = await Admin.modal.confirm({
              title: "Kaynağı sil",
              message: `<strong>${Admin.escapeHtml(row.name)}</strong> kalıcı olarak silinecek.`,
              okLabel: "Evet, sil", tone: "danger",
            });
            if (!ok) return;
            await Admin.db.rpc("admin_delete", { p_table: "feeds", p_key: "id", p_id: String(row.id) });
            document.dispatchEvent(new CustomEvent("admin:audit", { detail: { table: "feeds", op: "delete" } }));
            Admin.toast.ok("Silindi");
            close();
            load();
          }});
        }
        const back = Admin.modal.open({ title: isNew ? "Yeni kaynak" : "Kaynağı düzenle", body, actions });
      }

      load();
      return () => { container.innerHTML = ""; };
    },
  });
})();
