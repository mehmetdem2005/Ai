(function () {
  const Admin = window.Admin = window.Admin || {};

  const TONE_MAP = {
    success: "ok", published: "ok", active: "ok", running: "ok",
    pending: "warn", in_progress: "warn", queued: "warn", draft: "warn",
    rejected: "err", failure: "err", failed: "err", inactive: "mute",
    delivered: "ok", read: "info", cancelled: "mute", timeout: "err",
  };

  function badge(text, toneOverride) {
    const tone = toneOverride || TONE_MAP[String(text || "").toLowerCase()] || "info";
    const span = document.createElement("span");
    span.className = "badge tone-" + tone;
    span.textContent = text || "—";
    return span;
  }

  function badgeHTML(text, toneOverride) {
    const tone = toneOverride || TONE_MAP[String(text || "").toLowerCase()] || "info";
    return `<span class="badge tone-${tone}">${escapeHtml(text || "—")}</span>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  Admin.badge = badge;
  Admin.badgeHTML = badgeHTML;
  Admin.escapeHtml = escapeHtml;
})();
