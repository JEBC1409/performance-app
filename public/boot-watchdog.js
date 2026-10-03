/* Boot watchdog — plain JS on purpose, so it still runs when the app's own
 * bundle never does (a stale service worker serving files that no longer exist,
 * a half-finished update, a cache from an old build…).
 *
 * The app marks <html data-booted="1"> once it is past its loading screens.
 * If that hasn't happened after TIMEOUT, the cause is almost always a stale
 * service worker / cache, so we clear exactly those (never the user's data in
 * IndexedDB / localStorage) and reload — automatically once every 10 minutes,
 * and otherwise with a button — instead of leaving a blank or endless screen. */
(function () {
  var TIMEOUT = 15000;
  var KEY = "performance_repair_at";
  var COOLDOWN = 10 * 60 * 1000;

  function booted() {
    return document.documentElement.getAttribute("data-booted") === "1";
  }

  function repair() {
    var work = [];
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        work.push(
          navigator.serviceWorker.getRegistrations().then(function (rs) {
            return Promise.all(rs.map(function (r) { return r.unregister(); }));
          })
        );
      }
    } catch {}
    try {
      if (window.caches) {
        work.push(
          caches.keys().then(function (ks) {
            return Promise.all(ks.map(function (k) { return caches.delete(k); }));
          })
        );
      }
    } catch {}
    return Promise.all(work).catch(function () {}).then(function () { location.reload(); });
  }

  function overlay() {
    if (document.getElementById("boot-watchdog")) return;
    var box = document.createElement("div");
    box.id = "boot-watchdog";
    box.setAttribute("role", "alert");
    box.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:#000;color:#fff;font-family:Inter,Helvetica,Arial,sans-serif;text-align:center";
    box.innerHTML =
      '<div style="max-width:340px">' +
      '<div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#df2531;margin-bottom:12px">PERFORMANCE</div>' +
      '<p style="font-size:16px;line-height:1.4;margin:0 0 8px">La app no terminó de cargar.</p>' +
      '<p style="font-size:13px;line-height:1.5;margin:0 0 20px;color:rgba(255,255,255,.65)">Suele ser una versión vieja guardada en el teléfono. Reparar la limpia y vuelve a abrir; tus datos no se borran.</p>' +
      '<button id="boot-watchdog-fix" style="border:0;border-radius:999px;padding:14px 28px;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:#8f0f1b">Reparar y reintentar</button>' +
      "</div>";
    document.body.appendChild(box);
    document.getElementById("boot-watchdog-fix").onclick = function () {
      this.disabled = true;
      this.textContent = "Reparando…";
      repair();
    };
  }

  setTimeout(function () {
    if (booted()) return;
    var last = 0;
    try { last = Number(localStorage.getItem(KEY)) || 0; } catch {}
    if (Date.now() - last > COOLDOWN) {
      try { localStorage.setItem(KEY, String(Date.now())); } catch {}
      repair();
    } else {
      overlay();
    }
  }, TIMEOUT);
})();
