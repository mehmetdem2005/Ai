(function () {
  const Admin = window.Admin;
  if (!Admin) return;

  Admin.register("cms", {
    mount(section, ctx) {
      const ph = section.querySelector(".card.placeholder");
      if (ph) ph.remove();
      const head = section.querySelector(".page-head");
      const container = document.createElement("div");
      head.after(container);

      let pages = [];
      let currentSlug = null;
      let stringsByKey = {};

      async function loadPages() {
        Admin.state.render(container, { loading: true });
        try {
          const { data } = await Admin.db.list("site_pages", { order: { col: "slug", asc: true } });
          pages = data;
          renderShell();
        } catch (e) {
          Admin.state.render(container, { error: e, retry: loadPages });
        }
      }

      function renderShell() {
        container.innerHTML = "";
        const tabs = document.createElement("div");
        tabs.className = "tabbar";
        pages.forEach((p) => {
          const btn = document.createElement("button");
          btn.className = "tab" + (p.slug === currentSlug ? " active" : "");
          btn.textContent = p.title || p.slug;
          btn.onclick = () => { currentSlug = p.slug; renderShell(); loadStrings(); };
          tabs.appendChild(btn);
        });
        container.appendChild(tabs);

        const headRow = document.createElement("div");
        headRow.className = "page-head-row";
        const left = document.createElement("div");
        const slug = currentSlug || (pages[0] && pages[0].slug);
        if (!currentSlug && slug) currentSlug = slug;
        const p = pages.find((x) => x.slug === currentSlug);
        if (p) {
          left.innerHTML = `
            <h2 style="margin:0 0 4px;font-size:18px">${Admin.escapeHtml(p.title)}</h2>
            <div style="font-size:13px;color:var(--mid)">${Admin.escapeHtml(p.description || "")}</div>
          `;
        }
        const right = document.createElement("div");
        right.className = "page-head-actions";
        if (Admin.db.can("cms.write")) {
          const add = document.createElement("button");
          add.className = "btn primary";
          add.textContent = "Yeni metin ekle";
          add.onclick = () => openEditor(null);
          right.appendChild(add);
        }
        headRow.appendChild(left);
        headRow.appendChild(right);
        container.appendChild(headRow);

        const tableHost = document.createElement("div");
        tableHost.id = "cmsTableHost";
        container.appendChild(tableHost);

        if (currentSlug) loadStrings();
      }

      async function loadStrings() {
        const host = container.querySelector("#cmsTableHost");
        Admin.state.render(host, { loading: true });
        try {
          const { data } = await Admin.db.list("site_strings", {
            eq: [["page_slug", currentSlug]],
            order: { col: "key", asc: true },
          });
          stringsByKey = {};
          data.forEach((s) => { stringsByKey[s.key + ":" + s.lang] = s; });
          renderTable(data);
        } catch (e) {
          Admin.state.render(host, { error: e, retry: loadStrings });
        }
      }

      function renderTable(rows) {
        const host = container.querySelector("#cmsTableHost");
        host.innerHTML = "";
        const t = Admin.table({
          columns: [
            { key: "key", label: "Anahtar", width: "220px", render: (r) =>
              `<code style="font-family:var(--font-mono);font-size:12px;color:var(--cyan-ink)">${Admin.escapeHtml(r.key)}</code>` },
            { key: "lang", label: "Dil", width: "60px", align: "center" },
            { key: "value", label: "Metin", render: (r) => {
              const v = (r.value || "").length > 140 ? r.value.slice(0, 137) + "…" : r.value;
              return `<span style="color:var(--ink-2)">${Admin.escapeHtml(v)}</span>`;
            }},
            { key: "updated_at", label: "Güncellendi", width: "140px", render: (r) =>
              `<span style="font-family:var(--font-mono);font-size:11.5px;color:var(--mid)">${new Date(r.updated_at).toLocaleString("tr-TR")}</span>` },
            { key: "_a", label: "", width: "80px", align: "right", render: (r) => {
              const btn = document.createElement("button");
              btn.className = "btn ghost";
              btn.textContent = "Düzenle";
              btn.onclick = (e) => { e.stopPropagation(); openEditor(r); };
              return btn;
            }},
          ],
          rowClick(row) { openEditor(row); },
        });
        host.appendChild(t.el);
        if (rows.length === 0) {
          Admin.state.render(host, {
            empty: true,
            emptyText: "Bu sayfa için henüz metin yok",
            emptySub: "İlk metni ekleyerek public sayfanın bir bölümünü DB-driven yap.",
            action: Admin.db.can("cms.write") ? { label: "Yeni metin ekle", onClick: () => openEditor(null) } : null,
          });
        } else {
          t.render(rows);
        }
      }

      function openEditor(row) {
        const isNew = !row;
        const body = document.createElement("div");
        const form = Admin.form({
          initial: row || { lang: "tr", page_slug: currentSlug, key: "", value: "", value_md: "" },
          fields: [
            { name: "key", label: "Anahtar (örn: hero.h1)", type: "text", required: true,
              help: "Public sayfadaki data-cms-key='...' ile eşleşmeli. Nokta ile ayır.",
              validate: (v) => /^[a-z][a-z0-9._-]*$/i.test(v) ? null : "Geçersiz anahtar formatı" },
            { name: "lang", label: "Dil", type: "select", options: [
              { value: "tr", label: "Türkçe" }, { value: "en", label: "English" },
            ]},
            { name: "value", label: "Düz metin", type: "textarea", required: true, rows: 4,
              help: "<h1>, paragraf gibi düz metin elementleri buradan beslenir." },
            { name: "value_md", label: "Markdown (opsiyonel)", type: "markdown",
              help: "Uzun içerik için. data-cms-md='key' attribute'lu element bunu render eder." },
          ],
          submitLabel: isNew ? "Ekle" : "Kaydet",
          onCancel: () => Admin.modal.close(back),
          async onSubmit(values) {
            await Admin.db.rpc("cms_set_string", {
              p_page_slug: currentSlug,
              p_key:       values.key,
              p_lang:      values.lang,
              p_value:     values.value,
              p_value_md:  values.value_md || null,
            });
            document.dispatchEvent(new CustomEvent("admin:audit",
              { detail: { table: "site_strings", op: "upsert" } }));
            Admin.toast.ok(isNew ? "Eklendi" : "Güncellendi");
            Admin.modal.close(back);
            loadStrings();
          },
        });
        body.appendChild(form.el);
        const actions = [];
        if (!isNew && Admin.db.can("cms.write")) {
          actions.push({ label: "Sil", tone: "danger", onClick: async ({close}) => {
            const ok = await Admin.modal.confirm({
              title: "Metni sil",
              message: `<code>${Admin.escapeHtml(row.key)}</code> kalıcı olarak silinecek. Public sayfada fallback (kod içi metin) görünür.`,
              okLabel: "Evet, sil", tone: "danger",
            });
            if (!ok) return;
            await Admin.db.rpc("cms_delete_string", {
              p_page_slug: row.page_slug, p_key: row.key, p_lang: row.lang,
            });
            document.dispatchEvent(new CustomEvent("admin:audit",
              { detail: { table: "site_strings", op: "delete" } }));
            Admin.toast.ok("Silindi");
            close();
            loadStrings();
          }});
        }
        const back = Admin.modal.open({
          title: isNew ? "Yeni metin" : "Metni düzenle",
          size: "lg", body, actions,
        });
      }

      loadPages();
      return () => { container.innerHTML = ""; };
    },
  });
})();
