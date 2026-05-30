(function () {
  const Admin = window.Admin = window.Admin || {};
  let stack;

  function ensure() {
    if (stack) return stack;
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
    return stack;
  }

  function show(msg, tone) {
    const t = document.createElement("div");
    t.className = "toast " + (tone || "info");
    t.textContent = msg;
    ensure().appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 200);
    }, 4000);
  }

  Admin.toast = {
    ok:   (m) => show(m, "ok"),
    err:  (m) => show(m, "err"),
    info: (m) => show(m, "info"),
    warn: (m) => show(m, "warn"),
  };
})();
