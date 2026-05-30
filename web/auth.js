// Sovereign · Auth katmanı (Supabase) — nav.js'in yarattığı topnav-actions'ı
// kullanıcının auth durumuna göre günceller. Admin için trigger/cron/panel butonları.

(function () {
  const SUPABASE_URL = "__SUPABASE_URL__";
  const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";
  const ADMIN_PANEL_URL = "__ADMIN_PANEL_URL__";

  // Tema/yoğunluk/aksan'ı render'dan önce uygula (FOUC önler).
  (function applyEarlyPrefs() {
    const html = document.documentElement;
    const theme = localStorage.getItem('sov_theme');
    if (theme && theme !== 'system') html.setAttribute('data-theme', theme);
    const density = localStorage.getItem('sov_density');
    if (density) html.setAttribute('data-density', density);
    const accent = localStorage.getItem('sov_accent');
    if (accent) html.setAttribute('data-accent', accent);
  })();

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
  flex-wrap: wrap;
}
.sov-admin-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600;
  padding: 7px 11px; border: 1px solid var(--line, #d1d9e0);
  background: var(--surface, #fff); color: var(--ink, #1F2328);
  border-radius: var(--radius, 6px); cursor: pointer; text-decoration: none;
  font-family: inherit; white-space: nowrap;
  min-height: 34px;
}
.sov-admin-btn:hover { background: var(--bg-2, #f8f9fa); text-decoration: none; }
.sov-admin-btn.primary { background: var(--cyan, #1F6FEB); color: #fff; border-color: var(--cyan, #1F6FEB); }
.sov-admin-btn.primary:hover { background: var(--cyan-ink, #0969DA); color: #fff; }
.sov-admin-btn.ghost { background: transparent; border-color: transparent; color: var(--mid, #59636E); }
.sov-admin-btn.ghost:hover { background: var(--bg-2, #f8f9fa); color: var(--ink, #1F2328); }
.sov-admin-btn:disabled { opacity: .5; cursor: not-allowed; }
/* Durum-renkli: cron AÇIK (yeşil) / KAPALI (kırmızı) — emoji bağımsız net gösterge */
.sov-admin-btn.state-on {
  background: var(--ok-soft, #DAFBE1); color: var(--ok, #1A7F37);
  border-color: rgba(26, 127, 55, 0.3);
}
.sov-admin-btn.state-on:hover { background: #c6f1d0; }
.sov-admin-btn.state-off {
  background: var(--alert-soft, #FFEBE9); color: var(--alert, #CF222E);
  border-color: rgba(207, 34, 46, 0.3);
}
.sov-admin-btn.state-off:hover { background: #ffd6d2; }
.sov-admin-btn .state-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: currentColor; flex-shrink: 0;
  display: inline-block;
}
.sov-user-email {
  font-size: 11.5px; color: var(--mid, #59636E);
  max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  padding: 0 4px;
}
/* Mobil: label HER ZAMAN görünür kalır (Supabase prensibi: net state)
   Bar wrap eder, butonlar 2 satıra geçebilir. Email gizlenir (yer kazanır). */
@media (max-width: 720px) {
  .sov-user-email { display: none; }
  .sov-admin-bar { gap: 5px; }
  .sov-admin-btn { font-size: 11.5px; padding: 6px 8px; gap: 4px; min-height: 32px; }
}
@media (max-width: 480px) {
  /* Çok dar ekranda butonlar bir satırda sığsın — Admin link 2. satıra wrap */
  .sov-admin-btn { font-size: 11px; padding: 5px 7px; }
  .sov-admin-bar { row-gap: 6px; }
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
    const backdrop = document.getElementById("sovBackdrop");
    if (!backdrop) {
      // Modal henüz inject olmadı — bir sonraki frame'de tekrar dene
      setTimeout(openLogin, 100);
      return;
    }
    backdrop.classList.add("open");
    setTimeout(() => {
      const em = document.getElementById("sovEmail");
      if (em) em.focus();
    }, 50);
  }

  // Sayfa içi gate butonları (admin/dashboard/ayarlar #gateSignIn, #signInBtn)
  // global olarak openLogin'i çağırabilsin
  window.sovOpenLogin = openLogin;

  // Document-level event delegation: nerede olursa olsun, .login-link tıklanırsa
  // login modal açılır. renderAuth'tan önce/sonra fark etmez, race condition yok.
  document.addEventListener("click", function (e) {
    const link = e.target.closest && e.target.closest(".login-link");
    if (!link) return;
    e.preventDefault();
    // Drawer açıksa kapat (modal drawer'ın üstüne çıksın, görsel temiz olsun)
    const drawer = document.getElementById("navDrawer");
    if (drawer && drawer.classList.contains("open")) {
      drawer.classList.remove("open");
      document.body.style.overflow = "";
    }
    openLogin();
  });

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
    // Tüm durum sınıflarını temizle
    btn.classList.remove("primary", "ghost", "state-on", "state-off");
    if (state === "active") {
      btn.innerHTML = '<span class="state-dot"></span><span class="label">Cron Açık</span>';
      btn.title = "Otomatik cron çalışıyor (08:00 ve 18:00 İstanbul) — tıkla durdur.";
      btn.classList.add("state-on");
    } else if (state === "unknown") {
      btn.innerHTML = '<span class="state-dot" style="background:var(--mid,#59636E)"></span><span class="label">Cron ?</span>';
      btn.title = "Cron durumu okunamadı.";
    } else {
      btn.innerHTML = '<span class="state-dot"></span><span class="label">Cron Kapalı</span>';
      btn.title = "Otomatik cron durduruldu — tıkla başlat.";
      btn.classList.add("state-off");
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

    // Drawer admin section'ı varsayılan olarak gizle — admin ise aşağıda gösterilir.
    // Logout sonrası temiz state için her renderAuth çağrısında reset edilir.
    const adminSection = document.getElementById("navAdminSection");
    if (adminSection) adminSection.classList.remove("visible");

    // nav.js'in koyduğu TÜM "Giriş" linkleri — masthead + drawer + sayfa içi gate'ler
    // (querySelectorAll, sadece masthead değil tüm sayfa)
    const allLoginLinks = document.querySelectorAll(".login-link");
    const loginLink = actions.querySelector(".login-link");

    if (!session) {
      // Anon: TÜM .login-link tıklamalarını modal'a bağla
      allLoginLinks.forEach((link) => {
        link.onclick = (e) => {
          e.preventDefault();
          // Drawer açıksa önce kapat (modal drawer'ın üstüne çıksın, görsel temiz olsun)
          const drawer = document.getElementById("navDrawer");
          if (drawer && drawer.classList.contains("open")) {
            drawer.classList.remove("open");
            document.body.style.overflow = "";
          }
          openLogin();
        };
        link.style.display = "";
      });
      return;
    }

    // Login olmuş: TÜM "Giriş" linklerini gizle, admin bar ekle
    allLoginLinks.forEach((link) => { link.style.display = "none"; });

    const u = session.user;
    const role = (u && u.app_metadata && u.app_metadata.role) || "user";

    const bar = document.createElement("div");
    bar.className = "sov-admin-bar";

    // Admin ise drawer'daki admin section'ı göster.
    // (yukarıda zaten reset edildi; sadece admin değilse gizli kalır)
    if (role === "admin" && adminSection) {
      adminSection.classList.add("visible");
    }

    const emailSpan = document.createElement("span");
    emailSpan.className = "sov-user-email";
    emailSpan.textContent = u.email || "";
    bar.appendChild(emailSpan);

    const logoutBtn = makeBtn('⎋ <span class="label">Çıkış</span>', "ghost");
    logoutBtn.title = "Çıkış yap";
    logoutBtn.onclick = logout;
    bar.appendChild(logoutBtn);

    actions.appendChild(bar);
  }

  // Masthead'deki "Son güncelleme: ..." metnini en güncel bülten tarihinden doldur.
  async function refreshMasthead() {
    const el = document.querySelector(".masthead .vol");
    if (!el) return;
    try {
      const r = await fetch("/data.json", { cache: "no-store" });
      const data = await r.json();
      if (!Array.isArray(data) || !data.length) return;
      const d = new Date(data[0].created_at);
      const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
      const pad = (n) => String(n).padStart(2, "0");
      const text = `Son güncelleme: ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      // data-i18n'i kaldır ki i18n.js statik değeri override etmesin
      el.removeAttribute("data-i18n");
      el.textContent = text;
    } catch {
      // sessizce geç — masthead default text kalır
    }
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
      refreshMasthead();
      window.sovSb.auth.onAuthStateChange(() => renderAuth());
    }, 100);
  }

  ready(init);
})();
