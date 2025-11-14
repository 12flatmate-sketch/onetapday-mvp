import "./firebase-init.js";

// Читаем пользователя
let currentUserEmail = null;

try {
  const rawUser = localStorage.getItem("currentUser");
  if (rawUser) {
    const parsed = JSON.parse(rawUser);
    currentUserEmail = parsed.email || parsed.userEmail || null;
  }
  if (!currentUserEmail) {
    currentUserEmail = localStorage.getItem("userEmail") || null;
  }
} catch (e) {
  console.error("Failed to parse currentUser", e);
}

// Применить состояние
function applyRemoteState(remoteState) {
  try {
    localStorage.setItem("appState", JSON.stringify(remoteState));

    if (typeof window.renderAppFromState === "function") {
      window.renderAppFromState(remoteState);
    }

    if (window.appState) window.appState = remoteState;

    console.log("Firebase sync: state applied");
  } catch (e) {
    console.error("Failed to apply remote state", e);
  }
}

// Подписка
if (currentUserEmail && window.FirebaseSync) {
  const { subscribeUserState } = window.FirebaseSync;
  subscribeUserState(currentUserEmail, applyRemoteState);
}

// Сохранение
window.saveAppStateToCloud = async function (newState) {
  try {
    const state = newState || window.appState || {};
    localStorage.setItem("appState", JSON.stringify(state));

    // твой бэк (если нужен)
    try {
      await fetch("/app-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state)
      });
    } catch (e) {
      console.warn("Backend save failed", e);
    }

    // Firebase
    if (currentUserEmail && window.FirebaseSync) {
      const { saveUserState } = window.FirebaseSync;
      await saveUserState(currentUserEmail, state);
    }
  } catch (e) {
    console.error("saveAppStateToCloud failed", e);
  }
};
