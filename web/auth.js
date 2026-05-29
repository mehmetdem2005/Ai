// Sovereign · Auth katmanı (Supabase) — nav.js'in yarattığı topnav-actions'ı
// kullanıcının auth durumuna göre günceller. Admin için trigger/cron/panel butonları.

(function () {
  const SUPABASE_URL = "__SUPABASE_URL__";
  const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";
  const ADMIN_PANEL_URL = "__ADMIN_PANEL_URL__";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function injectModal() {
    if (document.getElementById("sov-login-modal")) return;
    const div = document.createElement("div");
    div.id = "sov-login-modal";
    div.innerHTML = `
<div class="sov-modal-backdrop" id="sovBackdrop">
  <div class="sov-modal">
    <div class="sov-modal-h">
      <h2>Giriş</h2>
      <button class="sov-modal-x" aria-label="Kapat">×</button>
    </div>
    <p class="sov-modal-p">Yetkili kullanıcılar admin paneline erişebilir ve bülteni manuel tetikleyebilir.</p>
    <div class="sov-err" id="sovErr"></div>
    <form id="sovLoginForm">
      <label>E-posta</label>
      <input type="email" id="sovEmail" required autocomplete="email" />
      <label>Şifre</label>
      <input type="password" id="sovPw" required autocomplete="current-password" />
      <div class="sov-actions">
        <button type="button" class="sov-btn ghost" id="sovCancel">İptal</button>
        <button type="submit" class="sov-btn primary" id="sovSubmit">Giriş Yap</button>
      </div>
    </form>
  </div>
</div>

<div class="sov-modal-backdrop" id="sovTriggerBackdrop">
  <div class="sov-modal">
    <div class="sov-modal-h">
      <h2>🚀 Tetikleme</h2>
      <button class="sov-modal-x" aria-label="Kapat">×</button>
    </div>
    <div class="sov-ok-msg">
      Worker tetiklendi. Yeni bülten 3-6 dakika içinde okuyucuda görünecek.<br><br>
      <a href="https://github.com/mehmetdem2005/Ai/actions" target="_blank" rel="noopener">GitHub Actions'ta izle →</a>
    </div>
    <div class="sov-actions">
      <button type="button" class="sov-btn primary" id="sovTriggerClose" style="flex:1">Tamam</button>
    </div>
  </div>
</div>
`;
    document.body.appendChild(div);

    // Stil — tokens.css değişkenlerini kullanır
    const style = document.createElement("style");
    style.textContent = `
.sov-modal-backdrop {
  position: fixed; inset: 0; background: rgba(15,18,24,.55);
  display: none; align-items: center; justify-content: center;
  z-index: 9999; padding: 16px;
}
.sov-modal-backdrop.open { display: flex; }
.sov-modal {
  background: var(--surface, #fff); border-radius: var(--radius-lg, 10px);
  padding: 26px 24px; width: 100%; max-width: 380px;
  box-shadow: var(--shadow-lg, 0 16px 32px rgba(0,0,0,.15));
  border: 1px solid var(--line, #d1d9e0);
}
.sov-modal-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.sov-modal-h h2 { margin: 0; font-size: 17px; font-weight: 600; color: var(--ink, #1F2328); }
.sov-modal-x { background: none; border: none; font-size: 22px; cursor: pointer; color: var(--mid, #59636E); padding: 0 4px; }
.sov-modal-p { margin: 0 0 16px; color: var(--mid, #59636E); font-size: 13px; }
.sov-modal label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--mid, #59636E); margin: 6px 0 4px; font-weight: 600; }
.sov-modal input { width: 100%; padding: 10px 11px; border: 1px solid var(--line, #d1d9e0); border-radius: var(--radius, 6px); font-family: inherit; font-size: 13.5px; background: var(--bg, #fff); color: var(--ink, #1F2328); -webkit-appearance: none; appearance: none; }
.sov-modal input:focus { outline: none; border-color: var(--cyan, #1F6FEB); }
.sov-actions { display: flex; gap: 8px; margin-top: 16px; }
.sov-actions button { flex: 1; }
.sov-btn { padding: 9px 14px; border-radius: var(--radius, 6px); border: 1px solid var(--line, #d1d9e0); background: var(--surface, #fff); color: var(--ink, #1F2328); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
.sov-btn:hover:not(:disabled) { background: var(--bg-2, #f8f9fa); }
.sov-btn.primary { background: var(--cyan, #1F6FEB); color: #fff; border-color: var(--cyan, #1F6FEB); }
.sov-btn.primary:hover:not(:disabled) { background: var(--cyan-ink, #0969DA); }
.sov-btn.ghost { background: transparent; }
.sov-btn:disabled { opacity: .5; cursor: not-allowed; }
.sov-err { color: var(--alert, #CF222E); font-size: 12.5px; padding: 7px 10px; background: var(--alert-soft, #FFEBE9); border-radius: var(--radius, 6px); margin: 0 0 10px; display: none; }
.sov-err.show { display: block; }
.sov-ok-msg { color: var(--ok, #1A7F37); font-size: 13px; padding: 11px 13px; background: var(--ok-soft, #DAFBE1); border-radius: var(--radius, 6px); margin: 4px 0 12px; }
.sov-ok-msg a { color: var(--cyan, #1F6FEB); }

.sov-admin-bar {
  display: flex; gap: 6px; align-items: center;
  margin-left: 8px;
}
.sov-admin-btn {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600;
  padding: 6px 10px; border: 1px solid var(--line, #d1d9e0);
  background: var(--surface, #fff); color: var(--ink, #1F2328);
  border-radius: var(--radius, 6px); cursor: pointer; text-decoration: none;
  font-family: inherit; white-space: nowrap;
}
.sov-admin-btn:hover { background: var(--bg-2, #f8f9fa); text-decoration: none; }
.sov-admin-btn.primary { background: var(--cyan, #1F6FEB); color: #fff; border-color: var(--cyan, #1F6FEB); }
.sov-admin-btn.primary:hover { background: var(--cyan-ink, #0969DA); color: #fff; }
.sov-admin-btn.ghost { background: transparent; }
.sov-admin-btn:disabled { opacity: .5; cursor: not-allowed; }
.sov-user-email {
  font-size: 11.5px; color: var(--mid, #59636E);
  max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  padding: 0 4px;
}
@media (max-width: 720px) {
  .sov-user-email { display: none; }
  .sov-admin-btn .label { display: none; }
}
`;
    document.head.appendChild(style);
  }

  function setupModalEvents() {
    const back = document.getElementById("sovBackdrop");
    const triggerBack = document.getElementById("sovTriggerBackdrop");
    function close() { back.classList.remove("open"); document.getElementById("sovErr").classList.remove("show"); }
    document.querySelectorAll("#sovBackdrop .sov-modal-x, #sovCancel").forEach(el => el.onclick = close);
    back.addEventListener("click", e => { if (e.target === back) close(); });

    document.querySelectorAll("#sovTriggerBackdrop .sov-modal-x, #sovTriggerClose").forEach(el => el.onclick = () => triggerBack.classList.remove("open"));
    triggerBack.addEventListener("click", e => { if (e.target === triggerBack) triggerBack.classList.remove("open"); });

    document.getElementById("sovLoginForm").onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById("sovEmail").value.trim();
      const password = document.getElementById("sovPw").value;
      const submit = document.getElementById("sovSubmit");
      const err = document.getElementById("sovErr");
      submit.disabled = true; submit.textContent = "Giriş yapılıyor…";
      const { error } = await window.sovSb.auth.signInWithPassword({ email, password });
      submit.disabled = false; submit.textContent = "Giriş Yap";
      if (error) {
        err.textContent = error.message || "Giriş başarısız.";
        err.classList.add("show");
        return;
      }
      close();
      await renderAuth();
    };
  }

  function openLogin() {
    document.getElementById("sovBackdrop").classList.add("open");
    setTimeout(() => document.getElementById("sovEmail").focus(), 50);
  }

  async function logout() {
    await window.sovSb.auth.signOut();
    await renderAuth();
  }

  async function triggerWorkflow(btn) {
    const { data: sess } = await window.sovSb.auth.getSession();
    const token = sess && sess.session && sess.session.access_token;
    if (!token) { openLogin(); return; }
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ <span class="label">Tetikleniyor…</span>';
    try {
      const r = await fetch("/api/trigger", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) { alert("Tetikleme başarısız: " + (out.error || r.status)); return; }
      document.getElementById("sovTriggerBackdrop").classList.add("open");
    } catch (exc) { alert("Ağ hatası: " + exc); }
    finally { btn.disabled = false; btn.innerHTML = orig; }
  }

  function paintCron(btn, state) {
    if (state === "active") {
      btn.innerHTML = '⏸️ <span class="label">Cron Açık</span>';
      btn.title = "Otomatik cron çalışıyor (08:00 ve 18:00 İstanbul) — tıkla durdur.";
      btn.classList.remove("primary"); btn.classList.add("ghost");
    } else if (state === "unknown") {
      btn.innerHTML = '⚠️ <span class="label">Cron ?</span>';
      btn.title = "Cron durumu okunamadı.";
    } else {
      btn.innerHTML = '▶️ <span class="label">Cron Kapalı</span>';
      btn.title = "Otomatik cron durduruldu — tıkla başlat.";
      btn.classList.remove("ghost"); btn.classList.add("primary");
    }
    btn.disabled = false;
  }

  async function refreshCron(btn) {
    const { data: sess } = await window.sovSb.auth.getSession();
    const token = sess && sess.session && sess.session.access_token;
    if (!token) return;
    try {
      const r = await fetch("/api/workflow-state", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { paintCron(btn, "unknown"); return; }
      const out = await r.json();
      paintCron(btn, out.state || "unknown");
    } catch { paintCron(btn, "unknown"); }
  }

  async function toggleCron(btn) {
    const { data: sess } = await window.sovSb.auth.getSession();
    const token = sess && sess.session && sess.session.access_token;
    if (!token) { openLogin(); return; }
    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = '⏳ <span class="label">Değişiyor…</span>';
    try {
      const r = await fetch("/api/workflow-toggle", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) { alert("Cron durumu değiştirilemedi: " + (out.error || r.status)); btn.innerHTML = orig; btn.disabled = false; return; }
      paintCron(btn, out.new_state);
    } catch (exc) {
      alert("Ağ hatası: " + exc); btn.innerHTML = orig; btn.disabled = false;
    }
  }

  function makeBtn(html, cls) {
    const b = document.createElement("button");
    b.className = "sov-admin-btn" + (cls ? " " + cls : "");
    b.innerHTML = html;
    return b;
  }

  async function renderAuth() {
    const actions = document.querySelector(".topnav-actions");
    if (!actions) return; // Bu sayfada masthead yok (örn. yonetim.html)

    const { data: sess } = await window.sovSb.auth.getSession();
    const session = sess && sess.session;

    // Önce eski admin bar varsa temizle (state değişti)
    const oldBar = actions.querySelector(".sov-admin-bar");
    if (oldBar) oldBar.remove();

    // nav.js'in koyduğu varsayılan "Giriş" linki — auth durumuna göre yöneteceğiz
    const loginLink = actions.querySelector(".login-link");

    if (!session) {
      // Anon: "Giriş" linkini aktif et
      if (loginLink) {
        loginLink.onclick = (e) => { e.preventDefault(); openLogin(); };
        loginLink.style.display = "";
      }
      return;
    }

    // Login olmuş: "Giriş" linkini gizle, admin bar ekle
    if (loginLink) loginLink.style.display = "none";

    const u = session.user;
    const role = (u && u.app_metadata && u.app_metadata.role) || "user";

    const bar = document.createElement("div");
    bar.className = "sov-admin-bar";

    if (role === "admin") {
      const triggerBtn = makeBtn('🚀 <span class="label">Bülten Tetikle</span>', "primary");
      triggerBtn.onclick = () => triggerWorkflow(triggerBtn);
      bar.appendChild(triggerBtn);

      const cronBtn = makeBtn('⏳ <span class="label">Cron…</span>');
      cronBtn.disabled = true;
      cronBtn.onclick = () => toggleCron(cronBtn);
      bar.appendChild(cronBtn);
      refreshCron(cronBtn);

      const adminLink = document.createElement("a");
      adminLink.className = "sov-admin-btn";
      adminLink.href = ADMIN_PANEL_URL;
      adminLink.target = "_blank";
      adminLink.rel = "noopener";
      adminLink.innerHTML = '⚙️ <span class="label">Admin</span>';
      bar.appendChild(adminLink);
    }

    const emailSpan = document.createElement("span");
    emailSpan.className = "sov-user-email";
    emailSpan.textContent = u.email || "";
    bar.appendChild(emailSpan);

    const logoutBtn = makeBtn('⎋ <span class="label">Çıkış</span>', "ghost");
    logoutBtn.title = "Çıkış";
    logoutBtn.onclick = logout;
    bar.appendChild(logoutBtn);

    actions.appendChild(bar);
  }

  async function init() {
    if (!window.supabase || !SUPABASE_URL || SUPABASE_URL.indexOf("__") === 0) {
      return; // Supabase CDN yüklenmedi ya da placeholder eksik
    }
    window.sovSb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "sov-auth" },
    });

    // nav.js'in DOM injection'ı önce bitsin
    setTimeout(() => {
      injectModal();
      setupModalEvents();
      renderAuth();
      window.sovSb.auth.onAuthStateChange(() => renderAuth());
    }, 100);
  }

  ready(init);
})();
