// sync-cloud.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function keyFromEmail(email) {
  return email
    .trim()
    .toLowerCase()
    .replace(/\./g, ",")
    .replace(/[^a-z0-9,@_-]/g, "");
}

function normalizeState(raw) {
  if (!raw || typeof raw !== "object") return {};
  return {
    tx: raw.tx || [],
    bills: raw.bills || [],
    kasa: raw.kasa || [],
    accMeta: raw.accMeta || {},
    settings: raw.settings || {}
  };
}

window.FirebaseSync = {
  subscribeUserState(email, cb) {
    const key = keyFromEmail(email);
    if (!key) return;
    const r = ref(db, "users/" + key + "/state");
    onValue(r, snap => cb(snap.val() || null));
  },

  async saveUserState(email, state) {
    const key = keyFromEmail(email);
    if (!key) return;
    await set(ref(db, "users/" + key + "/state"), normalizeState(state));
  }
};
