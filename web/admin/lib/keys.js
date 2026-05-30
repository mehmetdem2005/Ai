(function () {
  const Admin = window.Admin = window.Admin || {};

  const ROUTE_CHORDS = {
    o: "overview", n: "newsletters", a: "articles", c: "cms",
    s: "sources", r: "cron", u: "users", i: "iam", l: "audit", t: "settings",
  };

  let lastG = 0;

  function showHelp() {
    if (!Admin.modal) return;
    const items = [
      ["/", "Global arama"],
      ["?", "Bu yardım"],
      ["Esc", "Açık modal/drawer kapat"],
      ["g + o", "Özet"],
      ["g + a", "Makaleler"],
      ["g + n", "Bültenler"],
      ["g + c", "Site metinleri"],
      ["g + s", "Kaynaklar"],
      ["g + r", "Cron & worker"],
      ["g + u", "Pro kullanıcılar"],
      ["g + i", "Erişim"],
      ["g + l", "Audit log"],
      ["g + t", "Ayarlar"],
    ];
    const body = document.createElement("div");
    body.className = "keys-help";
    items.forEach(([k, l]) => {
      const row = document.createElement("div");
      row.className = "keys-row";
      row.innerHTML = `<kbd>${k}</kbd><span>${l}</span>`;
      body.appendChild(row);
    });
    Admin.modal.open({ title: "Klavye kısayolları", body, actions: [{ label: "Kapat", onClick: ({close}) => close() }] });
  }

  function isTyping(e) {
    const t = e.target;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  }

  document.addEventListener("keydown", (e) => {
    if (isTyping(e) && e.key !== "Escape") return;
    if (e.key === "/") { e.preventDefault(); document.getElementById("globalSearch")?.focus(); return; }
    if (e.key === "?") { e.preventDefault(); showHelp(); return; }
    if (e.key === "g") { lastG = Date.now(); return; }
    if (Date.now() - lastG < 800) {
      const route = ROUTE_CHORDS[e.key.toLowerCase()];
      if (route) { e.preventDefault(); location.hash = "#/" + route; lastG = 0; }
    }
  });

  Admin.keys = { showHelp };
})();
