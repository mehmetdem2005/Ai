(function () {
  const Admin = window.Admin;
  if (!Admin) return;

  const ROLE_TONE = { superadmin: "err", admin: "info", editor: "warn", viewer: "mute" };
  const ROLES = ["superadmin", "admin", "editor", "viewer"];

  Admin.register("iam", {
    mount(section, ctx) {
      const ph = section.querySelector(".card.placeholder");
      if (ph) ph.remove();
      const head = section.querySelector(".page-head");
      const container = document.createElement("div");
      head.after(container);

      const isSuper = ctx.role === "superadmin";

      const headRow = document.createElement("div");
      headRow.className = "page-head-row";
      headRow.innerHTML = `<div></div><div class="page-head-actions"></div>`;
      if (isSuper) {
        const btn = document.createElement("button");
        btn.className = "btn primary";
        btn.textContent = "Yeni admin ekle";
        btn.onclick = openGrantModal;
        headRow.querySelector(".page-head-actions").appendChild(btn);
      }
      container.appendChild(headRow);

      const tableHost = document.createElement("div");
      container.appendChild(tableHost);

      async function load() {
        Admin.state.render(tableHost, { loading: true });
        try {
          const data = await Admin.db.rpc("admin_list_users");
          renderTable(data || []);
        } catch (e) {
          Admin.state.render(tableHost, { error: e, retry: load });
        }
      }

      function renderTable(rows) {
        tableHost.innerHTML = "";
        const t = Admin.table({
          columns: [
            { key: "email", label: "Email", render: (r) =>
              `<span style="font-family:var(--font-mono);font-size:12.5px">${Admin.escapeHtml(r.email)}</span>` },
            { key: "role", label: "Rol", width: "120px", render: (r) =>
              Admin.badgeHTML(r.role, ROLE_TONE[r.role]) },
            { key: "active", label: "Durum", width: "80px", render: (r) =>
              Admin.badgeHTML(r.active ? "active" : "inactive", r.active ? "ok" : "mute") },
            { key: "granted_at", label: "Eklendi", width: "140px", render: (r) =>
              `<span style="font-family:var(--font-mono);font-size:11.5px;color:var(--mid)">${new Date(r.granted_at).toLocaleDateString("tr-TR")}</span>` },
            { key: "granted_by_email", label: "Ekleyen", render: (r) =>
              `<span style="font-family:var(--font-mono);font-size:11.5px;color:var(--mid)">${Admin.escapeHtml(r.granted_by_email || "—")}</span>` },
            { key: "_a", label: "", width: "100px", align: "right", render: (r) => {
              if (!isSuper) return "";
              const btn = document.createElement("button");
              btn.className = "btn ghost";
              btn.textContent = "Yönet";
              btn.onclick = (e) => { e.stopPropagation(); openEditModal(r); };
              return btn;
            }},
          ],
          rowClick(row) { if (isSuper) openEditModal(row); },
        });
        tableHost.appendChild(t.el);
        if (rows.length === 0) {
          Admin.state.render(tableHost, { empty: true, emptyText: "Henüz admin yok" });
        } else t.render(rows);
      }

      function openGrantModal() {
        const body = document.createElement("div");
        const form = Admin.form({
          initial: { email: "", role: "admin" },
          fields: [
            { name: "email", label: "Kullanıcı e-postası", type: "email", required: true,
              help: "Sistemde kayıtlı bir kullanıcı olmalı." },
            { name: "role", label: "Rol", type: "select",
              options: ROLES.map((r) => ({ value: r, label: r })) },
          ],
          submitLabel: "Yetki ver",
          onCancel: () => Admin.modal.close(back),
          async onSubmit(values) {
            const lookup = await Admin.db.rpc("admin_lookup_user", { p_email: values.email });
            if (!lookup || !lookup.length) throw new Error("Bu e-posta ile kayıtlı kullanıcı yok");
            await Admin.db.setAdminRole(lookup[0].user_id, values.role, true);
            Admin.toast.ok("Yetki verildi");
            Admin.modal.close(back);
            load();
          },
        });
        body.appendChild(form.el);
        const back = Admin.modal.open({ title: "Yeni admin ekle", body });
      }

      function openEditModal(row) {
        const isSelf = row.user_id === ctx.session.user.id;
        const body = document.createElement("div");
        body.innerHTML = `
          <div style="margin-bottom:14px;padding:10px 12px;background:var(--bg-2);border-radius:var(--radius);font-size:13px">
            <strong>${Admin.escapeHtml(row.email)}</strong>
            ${isSelf ? `<span class="badge tone-warn" style="margin-left:8px">SEN</span>` : ""}
          </div>
        `;
        const form = Admin.form({
          initial: { role: row.role, active: row.active },
          fields: [
            { name: "role", label: "Rol", type: "select",
              options: ROLES.map((r) => ({ value: r, label: r })) },
            { name: "active", label: "Aktif", type: "toggle",
              help: isSelf ? "Kendini devre dışı bırakamazsın." : "Pasif yapınca admin paneline erişemez." },
          ],
          submitLabel: "Kaydet",
          onCancel: () => Admin.modal.close(back),
          async onSubmit(values) {
            if (isSelf && (values.role !== "superadmin" || !values.active)) {
              throw new Error("Kendi rolünü düşüremez ya da kendini devre dışı bırakamazsın");
            }
            await Admin.db.setAdminRole(row.user_id, values.role, !!values.active);
            Admin.toast.ok("Güncellendi");
            Admin.modal.close(back);
            load();
          },
        });
        body.appendChild(form.el);

        const actions = [];
        if (!isSelf && row.active) {
          actions.push({ label: "Revoke", tone: "danger", onClick: async ({close}) => {
            const ok = await Admin.modal.confirm({
              title: "Yetkiyi geri al",
              message: `<strong>${Admin.escapeHtml(row.email)}</strong> artık admin paneline erişemeyecek.`,
              okLabel: "Evet, revoke et", tone: "danger",
            });
            if (!ok) return;
            await Admin.db.setAdminRole(row.user_id, row.role, false);
            Admin.toast.ok("Revoke edildi");
            close(); load();
          }});
        }

        const back = Admin.modal.open({ title: "Yetki yönet", body, actions });
      }

      load();
      return () => { container.innerHTML = ""; };
    },
  });
})();
