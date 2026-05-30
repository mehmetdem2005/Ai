(function () {
  const Admin = window.Admin = window.Admin || {};

  function createDetail(opts) {
    const wrap = document.createElement("div");
    wrap.className = "detail";

    const head = document.createElement("div");
    head.className = "detail-head";
    head.innerHTML = `
      <div class="detail-icon">${opts.icon || ""}</div>
      <div class="detail-meta">
        <div class="detail-title">${Admin.escapeHtml(opts.title || "")}</div>
        ${opts.subtitle ? `<div class="detail-sub">${Admin.escapeHtml(opts.subtitle)}</div>` : ""}
      </div>
      <div class="detail-badges"></div>
      <div class="detail-actions"></div>
    `;
    const badgesEl = head.querySelector(".detail-badges");
    (opts.badges || []).forEach((b) => badgesEl.appendChild(Admin.badge(b.text, b.tone)));
    const actionsEl = head.querySelector(".detail-actions");
    (opts.actions || []).forEach((a) => {
      const btn = document.createElement("button");
      btn.className = "btn " + (a.tone || "");
      btn.textContent = a.label;
      btn.onclick = a.onClick;
      actionsEl.appendChild(btn);
    });
    wrap.appendChild(head);

    const tabbar = document.createElement("div");
    tabbar.className = "tabbar";
    const tabContent = document.createElement("div");
    tabContent.className = "tab-content";

    const tabs = opts.tabs || [];
    const tabEls = {};
    tabs.forEach((t, i) => {
      const btn = document.createElement("button");
      btn.className = "tab";
      btn.textContent = t.label;
      btn.onclick = () => activate(t.id);
      tabbar.appendChild(btn);
      tabEls[t.id] = { btn, def: t, mounted: false };
    });
    wrap.appendChild(tabbar);
    wrap.appendChild(tabContent);

    function activate(id) {
      const sel = tabEls[id] ? id : tabs[0].id;
      Object.entries(tabEls).forEach(([tid, e]) => {
        e.btn.classList.toggle("active", tid === sel);
      });
      tabContent.innerHTML = "";
      const pane = document.createElement("div");
      pane.className = "tab-pane";
      tabContent.appendChild(pane);
      const def = tabEls[sel].def;
      try {
        const out = def.render ? def.render(pane) : null;
        if (out instanceof Node) pane.appendChild(out);
        else if (typeof out === "string") pane.innerHTML = out;
      } catch (e) {
        Admin.state.render(pane, { error: e });
      }
    }
    activate(opts.defaultTab || tabs[0]?.id);

    return { el: wrap, activate };
  }

  Admin.detail = createDetail;
})();
