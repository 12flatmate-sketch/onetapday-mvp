// sync-cloud.js — синк кассы, выписок и фактур через Firebase, без ломания кассы

import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyClatmXXE1ZG-MjKcHrquz2HSOZ4SswVVs",
  authDomain: "onetapday-d45a6.firebaseapp.com",
  databaseURL: "https://onetapday-d45a6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "onetapday-d45a6",
  storageBucket: "onetapday-d45a6.firebasestorage.app",
  messagingSenderId: "402338811274",
  appId: "1:402338811274:web:ad8ce7c6d47bb51b22cc73",
  measurementId: "G-DEDSHTT30C"
};

// не падаем от "app already exists"
let app;
try {
  app = getApp();
} catch (e) {
  app = initializeApp(firebaseConfig);
}
const db = getDatabase(app);

// тот же ключ, что и в базе: 1tapday@gmail.com -> 1tapday@gmail,com
function keyFromEmail(email) {
  if (!email) return "anon";
  return String(email)
    .trim()
    .toLowerCase()
    .replace(/\./g, ",")
    .replace(/[^a-z0-9,@_-]/g, "_");
}

// какие настройки тащим отдельно
const SETTINGS_KEYS = [
  "cashPLN",
  "penaltyPct",
  "intervalMin",
  "rateEUR",
  "rateUSD",
  "blacklist",
  "autoCash",
  "otd_lang",
  "speechLang",
  "txUrl",
  "billUrl",
  "otd_demo_started_at",
  "otd_sub_active",
  "otd_sub_from",
  "otd_sub_to"
];

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("[sync-cloud] parse error", key, e);
    return fallback;
  }
}

// собираем СЕЙЧАСШНЕЕ локальное состояние → в Firebase
function buildLocalState() {
  const tx    = readJSON("tx_manual_import", []);
  const bills = readJSON("bills_manual_import", []);
  const kasa  = readJSON("kasa", []);
  const accMeta = readJSON("accMeta", {});

  const settings = {};
  SETTINGS_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v != null) settings[k] = v;
  });

  // совместимость со старой схемой (всё в settings как строки)
  settings.tx_manual_import     = localStorage.getItem("tx_manual_import")     || "[]";
  settings.bills_manual_import  = localStorage.getItem("bills_manual_import")  || "[]";
  settings.kasa                 = localStorage.getItem("kasa")                 || "[]";
  settings.accMeta              = localStorage.getItem("accMeta")              || "{}";

  return {
    tx,
    bills,
    kasa,
    accMeta,
    settings
  };
}

// применяем состояние из Firebase → в localStorage и память
function applyStateToLocal(state) {
  if (!state || typeof state !== "object") return;

  const s = state.settings || {};

  // --- TX (wyciąg) ---
  let tx = [];
  if (Array.isArray(state.tx)) {
    tx = state.tx;
  } else if (typeof s.tx_manual_import === "string") {
    try { tx = JSON.parse(s.tx_manual_import); } catch (e) { tx = []; }
  }

  // --- Bills (faktury) ---
  let bills = [];
  if (Array.isArray(state.bills)) {
    bills = state.bills;
  } else if (typeof s.bills_manual_import === "string") {
    try { bills = JSON.parse(s.bills_manual_import); } catch (e) { bills = []; }
  }

  // --- Kasa (наличка) ---
  let kasa = [];
  if (Array.isArray(state.kasa)) {
    kasa = state.kasa;
  } else if (typeof s.kasa === "string") {
    try { kasa = JSON.parse(s.kasa); } catch (e) { kasa = []; }
  }

  // --- accMeta ---
  let accMeta = {};
  if (state.accMeta && typeof state.accMeta === "object") {
    accMeta = state.accMeta;
  } else if (typeof s.accMeta === "string") {
    try { accMeta = JSON.parse(s.accMeta); } catch (e) { accMeta = {}; }
  }

  localStorage.setItem("tx_manual_import", JSON.stringify(tx));
  localStorage.setItem("bills_manual_import", JSON.stringify(bills));
  localStorage.setItem("kasa", JSON.stringify(kasa));
  localStorage.setItem("accMeta", JSON.stringify(accMeta));

  // настройки
  Object.entries(s).forEach(([k, v]) => {
    if (v != null && typeof v !== "undefined") {
      localStorage.setItem(k, v);
    }
  });

  // дергаем твои функции из app.html
  if (typeof window.loadLocal === "function") window.loadLocal();
  if (typeof window.inferAccounts === "function") window.inferAccounts();
  if (typeof window.render === "function") window.render();
}

// обёртка для пуша в Firebase
function createPusher(stateRef) {
  let timer = null;
  let pushing = false;

  async function pushNow() {
    if (pushing) return;
    pushing = true;
    try {
      const snapshot = buildLocalState();
      await set(stateRef, snapshot);
      console.info("[sync-cloud] pushed");
    } catch (e) {
      console.warn("[sync-cloud] push error", e);
    } finally {
      pushing = false;
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(pushNow, 500);
  }

  return { pushNow, schedule };
}

(function boot() {
  try {
    const EMAIL_KEY = "otd_user"; // тот же ключ, что и в app.html
    const email = localStorage.getItem(EMAIL_KEY);

    if (!email) {
      console.info("[sync-cloud] no otd_user → cloud sync off");
      return;
    }

    const key = keyFromEmail(email);
    const stateRef = ref(db, "users/" + key + "/state");

    const { pushNow, schedule } = createPusher(stateRef);

    // 1) слушаем Firebase → обновляем локальное состояние
    onValue(stateRef, snap => {
      const val = snap.val();
      if (!val) return;
      console.info("[sync-cloud] remote update received");
      applyStateToLocal(val);
    });

    // 2) патчим saveLocal, чтобы ЛЮБОЕ локальное сохранение улетало в Firebase
    if (typeof window.saveLocal === "function") {
      const orig = window.saveLocal;
      window.saveLocal = function patchedSaveLocal() {
        orig.apply(this, arguments);
        schedule();
      };
      console.info("[sync-cloud] saveLocal patched");
    } else {
      // fallback, если вдруг что
      console.warn("[sync-cloud] saveLocal not found, fallback timer");
      setInterval(schedule, 30000);
    }

    // 3) стартовый пуш (чтобы в базе было хоть что-то актуальное)
    pushNow();

    // дебаг-хук
    window._otdCloudDebug = {
      path: "users/" + key + "/state",
      pushNow
    };

  } catch (e) {
    console.error("[sync-cloud] boot error", e);
  }
})();
