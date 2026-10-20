/* Diagnostic + repair page. Plain JS on purpose: it has to work when the app's own
 * bundle doesn't (a stale service worker, a half-finished update). It only ever
 * clears service workers and Cache Storage — never IndexedDB or localStorage,
 * where the training and habit data live. */
(function () {
  function rows(id, pairs) {
    var el = document.getElementById(id);
    pairs.forEach(function (p) {
      var dt = document.createElement("dt");
      dt.textContent = p[0];
      var dd = document.createElement("dd");
      dd.textContent = String(p[1]);
      el.appendChild(dt);
      el.appendChild(dd);
    });
  }

  var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  rows("screen", [
    ["Ancho de la página", window.innerWidth + " px"],
    ["Alto de la página", window.innerHeight + " px"],
    ["Pantalla del equipo", (screen.width || "?") + " × " + (screen.height || "?")],
    ["Zoom del equipo", window.devicePixelRatio || 1],
    ["Diseño que se usa", window.innerWidth >= 900 ? "computador (>= 900 px)" : "celular (< 900 px)"],
  ]);

  var swInfo = ["sin datos"];
  var cacheInfo = "sin datos";
  rows("install", [
    ["Navegador", navigator.userAgent],
    ["Como app instalada", standalone ? "sí" : "no"],
    ["Conexión", navigator.onLine ? "con internet" : "sin internet"],
  ]);

  function addExtra() {
    var parts = [];
    var p1 = navigator.serviceWorker && navigator.serviceWorker.getRegistrations
      ? navigator.serviceWorker.getRegistrations().then(function (rs) {
          swInfo = rs.length
            ? rs.map(function (r) {
                var w = r.active || r.waiting || r.installing;
                return (w ? w.state : "?") + (r.waiting ? " (hay una versión esperando)" : "");
              })
            : ["ninguno"];
        })
      : Promise.resolve();
    var p2 = window.caches && caches.keys
      ? caches.keys().then(function (ks) {
          cacheInfo = ks.length ? ks.length + " (" + ks.join(", ") + ")" : "vacío";
        })
      : Promise.resolve();
    return Promise.all([p1, p2]).then(function () {
      rows("install", [
        ["Service worker", swInfo.join(", ")],
        ["Archivos guardados", cacheInfo],
      ]);
    });
  }
  addExtra().catch(function () {});

  // Does the phone let this page read the app's database? (Opens it without changing it.)
  function probeDb() {
    var el = document.getElementById("dbinfo");
    function line(k, v) { rows("dbinfo", [[k, v]]); }
    if (!window.indexedDB) { line("Base de datos", "este navegador no la tiene"); return; }
    var req;
    try { req = indexedDB.open("performance-db"); } catch (e) { line("Abrir la base", "ERROR " + (e && e.name) + ": " + (e && e.message)); return; }
    req.onerror = function () { var e = req.error; line("Abrir la base", "ERROR " + (e && e.name) + ": " + (e && e.message)); };
    req.onblocked = function () { line("Abrir la base", "bloqueada por otra ventana de la app"); };
    req.onsuccess = function () {
      var idb = req.result;
      var names = Array.prototype.slice.call(idb.objectStoreNames);
      line("Abrir la base", "bien (versión " + idb.version + ", " + names.length + " tablas)");
      var chk = ["sets", "habitDays", "weights", "appConfig"].filter(function (n) { return names.indexOf(n) >= 0; });
      chk.forEach(function (n) {
        try {
          var tx = idb.transaction(n, "readonly");
          var st = tx.objectStore(n);
          var count = 0;
          var cur = st.openCursor();
          cur.onerror = function () { var e = cur.error; line("Leer " + n, "ERROR " + (e && e.name) + ": " + (e && e.message)); };
          cur.onsuccess = function () {
            var c = cur.result;
            if (c) { count++; c.continue(); } else { line("Leer " + n, "bien (" + count + " filas)"); }
          };
          tx.onerror = function () { var e = tx.error; if (e) line("Leer " + n, "ERROR " + (e.name) + ": " + (e.message)); };
        } catch (e) { line("Leer " + n, "ERROR " + (e && e.name) + ": " + (e && e.message)); }
      });
      setTimeout(function () { try { idb.close(); } catch (e) {} }, 4000);
    };
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(function (est) {
        var mb = function (n) { return Math.round((n || 0) / 1048576) + " MB"; };
        line("Espacio usado / permitido", mb(est.usage) + " / " + mb(est.quota));
      }).catch(function () {});
    }
  }
  probeDb();

  var errBox = document.getElementById("errors");
  var errs = [];
  try {
    errs = JSON.parse(localStorage.getItem("performance_error_log") || "[]");
  } catch (e) {}
  if (!errs.length) {
    errBox.textContent = "Ninguno guardado.";
  } else {
    errs
      .slice()
      .reverse()
      .forEach(function (e) {
        var d = document.createElement("div");
        d.className = "err";
        var small = document.createElement("small");
        small.textContent = new Date(e.at).toLocaleString("es-CO");
        d.appendChild(small);
        d.appendChild(document.createTextNode(e.msg + (e.stack ? " — " + e.stack : "")));
        errBox.appendChild(d);
      });
  }

  var msg = document.getElementById("msg");
  document.getElementById("repair").addEventListener("click", function () {
    msg.textContent = "Reparando…";
    var work = [];
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        work.push(
          navigator.serviceWorker.getRegistrations().then(function (rs) {
            return Promise.all(rs.map(function (r) { return r.unregister(); }));
          })
        );
      }
    } catch (e) {}
    try {
      if (window.caches) {
        work.push(
          caches.keys().then(function (ks) {
            return Promise.all(ks.map(function (k) { return caches.delete(k); }));
          })
        );
      }
    } catch (e) {}
    Promise.all(work)
      .catch(function () {})
      .then(function () {
        try { sessionStorage.clear(); } catch (e) {}
        msg.textContent = "Listo. Abriendo la app…";
        setTimeout(function () { location.replace("/?enter"); }, 600);
      });
  });
})();
