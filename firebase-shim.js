// =============================================================================
// Firebase adapter for the self-hosted (GitHub Pages) Inspection Log.
//
// The Inspection Log page talks to storage through window.claude.use("db" |
// "assets" | "downloads"). On claude.ai those are provided by the platform.
// Here, this file provides the same three things on top of Firebase, so the
// page code is identical in both places:
//   db        -> Cloud Firestore (with offline queueing for weak yard signal)
//   assets    -> Firebase Storage for photos, or compressed in-database photos
//                if Storage isn't enabled on the project
//   downloads -> a normal browser file download
// Everyone must sign in (Firebase Authentication, email + password) before any
// data loads. Accounts are created by the admin in the Firebase console.
// =============================================================================
(function () {
  "use strict";

  var cfg = window.FIREBASE_CONFIG || {};
  var configured = cfg.apiKey && cfg.apiKey.indexOf("PASTE_") !== 0 && cfg.projectId && cfg.projectId.indexOf("PASTE_") !== 0;

  // ---------- small UI: setup notice and sign-in gate ----------
  var css = document.createElement("style");
  css.textContent =
    "#fbGate{position:fixed;inset:0;z-index:1000;background:rgba(6,10,5,0.96);display:flex;align-items:center;justify-content:center;padding:16px}" +
    "#fbGate .box{width:100%;max-width:360px;background:#1A1E14;border:1px solid #414A31;border-top:3px solid #9EFF1F;border-radius:3px;padding:20px;color:#B8FF6B;font-family:'IBM Plex Sans',system-ui,sans-serif}" +
    "#fbGate h2{margin:0 0 4px;font-family:'Black Ops One','Rajdhani',sans-serif;font-weight:400;font-size:22px;text-transform:uppercase}" +
    "#fbGate p{margin:0 0 14px;font-size:12.5px;color:#7FA83E;line-height:1.5}" +
    "#fbGate label{display:block;font-family:'IBM Plex Mono',monospace;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#7FA83E;margin:10px 0 4px}" +
    "#fbGate input{width:100%;box-sizing:border-box;min-height:44px;padding:9px 10px;background:#171A10;color:#B8FF6B;border:1px solid #414A31;border-radius:2px;font-size:15px}" +
    "#fbGate button{margin-top:16px;width:100%;min-height:46px;background:#9EFF1F;color:#06120A;border:0;border-radius:2px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:14px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}" +
    "#fbGate .err{color:#FF6B52;font-family:'IBM Plex Mono',monospace;font-size:11.5px;margin-top:10px;min-height:14px}" +
    "#fbSignOut{font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.04em;background:none;border:0;color:#7FA83E;text-decoration:underline;cursor:pointer;padding:0;white-space:nowrap}";
  document.head.appendChild(css);

  function showGate(html) {
    var g = document.getElementById("fbGate");
    if (!g) { g = document.createElement("div"); g.id = "fbGate"; document.body.appendChild(g); }
    g.innerHTML = '<div class="box">' + html + '</div>';
    return g;
  }
  function hideGate() { var g = document.getElementById("fbGate"); if (g) g.remove(); }
  function whenBody(fn) { if (document.body) fn(); else document.addEventListener("DOMContentLoaded", fn); }

  // ---------- capability plumbing ----------
  var resolveReady, rejectReady;
  var ready = new Promise(function (res, rej) { resolveReady = res; rejectReady = rej; });
  var caps = {};

  window.claude = {
    use: function (name) {
      if (name === "downloads") return Promise.resolve(caps.downloads);
      if (name !== "db" && name !== "assets") return Promise.resolve(null);
      return ready.then(function () { return caps[name] || null; });
    }
  };

  // downloads works even before sign-in: it's just a browser file save.
  caps.downloads = {
    save: function (o) {
      var blob = new Blob([o.data], { type: /\.json$/i.test(o.filename) ? "application/json" : "text/csv;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = o.filename || "export.csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      return Promise.resolve();
    }
  };

  if (!configured || !window.firebase) {
    whenBody(function () {
      showGate('<h2>Setup needed</h2><p>' + (!window.firebase
        ? "Firebase didn't load. Check your internet connection and reload."
        : "Paste your Firebase project's settings into <b>firebase-config.js</b>, then reload. README.md walks through it in about 15 minutes.") + '</p>');
    });
    rejectReady(new Error("not configured"));
    return;
  }

  firebase.initializeApp(cfg);
  var fs = firebase.firestore();
  // Offline persistence: if a yard has no signal, submitted inspections queue on the
  // device and sync automatically when the phone reconnects.
  try { fs.enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) {}

  // Firestore's compat API already matches what the page uses
  // (collection/doc/where/orderBy/limit/get/onSnapshot/add/set/update).
  caps.db = {
    collection: function (path) { return fs.collection(path); },
    doc: function (path) { return fs.doc(path); }
  };

  // ---------- photos ----------
  function compress(file, maxDim, quality) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }
  var storageOk = !!(cfg.storageBucket && firebase.storage);
  caps.assets = {
    upload: function (blob) {
      var id = fs.collection("photos").doc().id;
      function inDatabase() {
        // Fallback when Firebase Storage isn't enabled: a small JPEG kept in Firestore.
        return compress(blob, 900, 0.6).then(function (dataUrl) {
          if (!dataUrl) throw new Error("Couldn't read that photo.");
          return fs.collection("photos").doc(id).set({ dataUrl: dataUrl, createdAt: new Date().toISOString() })
            .then(function () { return { id: id, url: dataUrl, sizeBytes: dataUrl.length, contentType: "image/jpeg" }; });
        });
      }
      if (!storageOk) return inDatabase();
      var ref = firebase.storage().ref("inspection-photos/" + id + ".jpg");
      return ref.put(blob, { contentType: blob.type || "image/jpeg" })
        .then(function () { return ref.getDownloadURL(); })
        .then(function (url) { return { id: id, url: url, sizeBytes: blob.size, contentType: blob.type || "image/jpeg" }; })
        .catch(function () { storageOk = false; return inDatabase(); });
    }
  };

  // ---------- sign-in gate ----------
  var auth = firebase.auth();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {});
  var released = false;

  function renderSignIn(msg) {
    var g = showGate(
      '<h2>Inspection Log</h2><p>Metra Coach Cleaning QC. Sign in with the account your administrator set up.</p>' +
      '<form id="fbForm" autocomplete="on">' +
      '<label for="fbEmail">Email</label><input id="fbEmail" type="email" autocomplete="username" required>' +
      '<label for="fbPass">Password</label><input id="fbPass" type="password" autocomplete="current-password" required>' +
      '<button type="submit" id="fbGo">Sign in</button><div class="err" id="fbErr">' + (msg || "") + '</div></form>');
    g.querySelector("#fbForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = g.querySelector("#fbGo"), err = g.querySelector("#fbErr");
      btn.disabled = true; btn.textContent = "Signing in…"; err.textContent = "";
      auth.signInWithEmailAndPassword(g.querySelector("#fbEmail").value.trim(), g.querySelector("#fbPass").value)
        .catch(function (ex) {
          btn.disabled = false; btn.textContent = "Sign in";
          err.textContent = /network/i.test(ex.code || "") ? "No connection. Try again when you have signal."
            : "Email or password didn't match.";
        });
    });
  }

  function addSignOut(user) {
    var wrap = document.querySelector(".beacon-wrap");
    if (!wrap || document.getElementById("fbSignOut")) return;
    var b = document.createElement("button");
    b.id = "fbSignOut"; b.type = "button"; b.textContent = "Sign out";
    b.title = user && user.email ? "Signed in as " + user.email : "Sign out";
    b.addEventListener("click", function () { auth.signOut().then(function () { location.reload(); }); });
    wrap.insertBefore(b, wrap.firstChild);
  }

  auth.onAuthStateChanged(function (user) {
    whenBody(function () {
      if (user) {
        hideGate();
        addSignOut(user);
        if (!released) { released = true; resolveReady(); }
      } else if (released) {
        location.reload();
      } else {
        renderSignIn();
      }
    });
  });
})();
