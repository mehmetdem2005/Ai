(function () {
  const Admin = window.Admin = window.Admin || {};

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function renderState(container, state) {
    if (!container) return;
    container.innerHTML = "";
    const wrap = el("div", "state-view");
    if (state.loading) {
      wrap.appendChild(el("div", "state-spinner", '<span class="dot"></span><span class="dot"></span><span class="dot"></span>'));
      wrap.appendChild(el("div", "state-msg", state.loadingText || "Yükleniyor…"));
    } else if (state.error) {
      wrap.appendChild(el("div", "state-icon err", "!"));
      wrap.appendChild(el("div", "state-msg", "Yüklenemedi"));
      wrap.appendChild(el("div", "state-sub", String(state.error.message || state.error)));
      if (state.retry) {
        const btn = el("button", "btn", "Tekrar dene");
        btn.onclick = state.retry;
        wrap.appendChild(btn);
      }
    } else if (state.empty) {
      wrap.appendChild(el("div", "state-icon empty", "∅"));
      wrap.appendChild(el("div", "state-msg", state.emptyText || "Henüz kayıt yok"));
      if (state.emptySub) wrap.appendChild(el("div", "state-sub", state.emptySub));
      if (state.action) {
        const btn = el("button", "btn primary", state.action.label);
        btn.onclick = state.action.onClick;
        wrap.appendChild(btn);
      }
    }
    container.appendChild(wrap);
  }

  Admin.state = { render: renderState, el };
})();
