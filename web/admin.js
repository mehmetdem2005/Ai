// Kaynak (RSS feed) yönetimi — Supabase REST ile. Bağımlılıksız, modüler.
// service_role anahtarı YALNIZCA tarayıcının localStorage'ında tutulur; repoya/sunucuya gitmez.

const SUPABASE_URL = "https://wsiossnmvuoemirsjwaw.supabase.co";
const KEY_STORE = "sb_admin_key";

const $ = (id) => document.getElementById(id);
const getKey = () => localStorage.getItem(KEY_STORE) || "";
const headers = () => ({
  apikey: getKey(),
  Authorization: `Bearer ${getKey()}`,
  "Content-Type": "application/json",
});

function setStatus(msg, kind = "info") {
  const el = $("status");
  el.textContent = msg;
  el.className = "status " + kind;
}

function validUrl(u) {
  try { const x = new URL(u); return x.protocol === "http:" || x.protocol === "https:"; }
  catch { return false; }
}

async function listFeeds() {
  if (!getKey()) { renderKeyGate(); return; }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/feeds?select=*&order=created_at`, { headers: headers() });
    if (r.status === 401 || r.status === 403) { setStatus("Anahtar geçersiz/yetkisiz.", "err"); return; }
    if (!r.ok) { setStatus("Liste alınamadı: " + r.status, "err"); return; }
    const feeds = await r.json();
    renderList(feeds);
    setStatus(`${feeds.length} kaynak yüklü.`, "ok");
  } catch (e) { setStatus("Bağlantı hatası: " + e.message, "err"); }
}

function renderList(feeds) {
  const box = $("feeds");
  box.innerHTML = "";
  if (!feeds.length) { box.innerHTML = '<p class="muted">Henüz kaynak yok.</p>'; return; }
  feeds.forEach((f) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML =
      `<div class="row-main">
         <div class="row-name">${escapeHtml(f.name)} ${f.active ? "" : '<span class="off">(pasif)</span>'}</div>
         <div class="row-url">${escapeHtml(f.url)}</div>
       </div>
       <div class="row-actions">
         <button data-id="${f.id}" data-active="${f.active}" class="toggle">${f.active ? "Pasifleştir" : "Aktifleştir"}</button>
         <button data-id="${f.id}" class="del">Sil</button>
       </div>`;
    box.appendChild(row);
  });
  box.querySelectorAll(".del").forEach((b) => b.onclick = () => removeFeed(b.dataset.id));
  box.querySelectorAll(".toggle").forEach((b) => b.onclick = () => toggleFeed(b.dataset.id, b.dataset.active !== "true"));
}

async function addFeed() {
  const name = $("name").value.trim();
  const url = $("url").value.trim();
  if (!name || !url) { setStatus("Ad ve URL gerekli.", "err"); return; }
  if (!validUrl(url)) { setStatus("Geçerli bir http(s) URL gir.", "err"); return; }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/feeds`, {
      method: "POST",
      headers: { ...headers(), Prefer: "return=minimal" },
      body: JSON.stringify({ name, url }),
    });
    if (r.status === 409) { setStatus("Bu URL zaten ekli.", "err"); return; }
    if (!r.ok) { setStatus("Eklenemedi: " + r.status + " " + (await r.text()).slice(0, 120), "err"); return; }
    $("name").value = ""; $("url").value = "";
    setStatus("Eklendi ✓ — bir sonraki bülten turunda kullanılacak.", "ok");
    listFeeds();
  } catch (e) { setStatus("Bağlantı hatası: " + e.message, "err"); }
}

async function removeFeed(id) {
  if (!confirm("Bu kaynağı silmek istediğine emin misin?")) return;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/feeds?id=eq.${id}`, { method: "DELETE", headers: headers() });
  if (!r.ok) { setStatus("Silinemedi: " + r.status, "err"); return; }
  setStatus("Silindi.", "ok"); listFeeds();
}

async function toggleFeed(id, active) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/feeds?id=eq.${id}`, {
    method: "PATCH", headers: headers(), body: JSON.stringify({ active }),
  });
  if (!r.ok) { setStatus("Güncellenemedi: " + r.status, "err"); return; }
  listFeeds();
}

function saveKey() {
  const k = $("keyInput").value.trim();
  if (!k) return;
  localStorage.setItem(KEY_STORE, k);
  $("keyInput").value = "";
  listFeeds();
}
function clearKey() { localStorage.removeItem(KEY_STORE); renderKeyGate(); setStatus("Anahtar cihazdan silindi.", "info"); }

function renderKeyGate() {
  $("feeds").innerHTML = '<p class="muted">Yönetim için service_role anahtarını gir (sadece bu cihazda saklanır).</p>';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

window.addEventListener("DOMContentLoaded", () => {
  $("addBtn").onclick = addFeed;
  $("saveKeyBtn").onclick = saveKey;
  $("clearKeyBtn").onclick = clearKey;
  $("refreshBtn").onclick = listFeeds;
  if (getKey()) listFeeds(); else renderKeyGate();
});
