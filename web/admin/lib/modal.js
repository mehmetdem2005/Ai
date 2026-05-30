(function () {
  const Admin = window.Admin = window.Admin || {};
  let openStack = [];

  function close(modal) {
    const i = openStack.indexOf(modal);
    if (i >= 0) openStack.splice(i, 1);
    modal.classList.remove("open");
    setTimeout(() => modal.remove(), 180);
  }

  function build(opts) {
    const back = document.createElement("div");
    back.className = "modal-backdrop";
    const card = document.createElement("div");
    card.className = "modal-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    if (opts.size) card.classList.add("size-" + opts.size);

    if (opts.title) {
      const h = document.createElement("div");
      h.className = "modal-head";
      h.innerHTML = `<h3>${opts.title}</h3><button class="modal-x" aria-label="Kapat">×</button>`;
      card.appendChild(h);
      h.querySelector(".modal-x").onclick = () => close(back);
    }
    const body = document.createElement("div");
    body.className = "modal-body";
    if (typeof opts.body === "string") body.innerHTML = opts.body;
    else if (opts.body instanceof Node) body.appendChild(opts.body);
    card.appendChild(body);

    if (opts.actions && opts.actions.length) {
      const foot = document.createElement("div");
      foot.className = "modal-foot";
      opts.actions.forEach((a) => {
        const b = document.createElement("button");
        b.className = "btn " + (a.tone || "");
        b.textContent = a.label;
        b.onclick = () => Promise.resolve(a.onClick && a.onClick({ close: () => close(back) })).catch(() => {});
        foot.appendChild(b);
      });
      card.appendChild(foot);
    }

    back.appendChild(card);
    back.addEventListener("click", (e) => { if (e.target === back) close(back); });
    document.body.appendChild(back);
    openStack.push(back);
    requestAnimationFrame(() => back.classList.add("open"));
    const focusable = card.querySelector("input,textarea,select,button:not(.modal-x)");
    if (focusable) setTimeout(() => focusable.focus(), 50);
    return back;
  }

  function confirm(opts) {
    return new Promise((resolve) => {
      build({
        title: opts.title || "Onayla",
        body: `<p class="modal-msg">${opts.message || ""}</p>`,
        actions: [
          { label: opts.cancelLabel || "İptal", onClick: ({close}) => { close(); resolve(false); } },
          { label: opts.okLabel || "Onayla", tone: opts.tone || "primary",
            onClick: ({close}) => { close(); resolve(true); } },
        ],
      });
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openStack.length) {
      e.preventDefault();
      close(openStack[openStack.length - 1]);
    }
  });

  Admin.modal = { open: build, confirm, close };
})();
