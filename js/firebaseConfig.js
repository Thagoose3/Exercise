/**
 * Firebase Configuration and Initialization
 * Connects Firebase Authentication (Google Sign-In) and Cloud Firestore.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Production Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCzBTUxXXBSUPKeCuMp5XeCfB3i_qrw7KY",
  authDomain: "exercise-65ee5.firebaseapp.com",
  projectId: "exercise-65ee5",
  storageBucket: "exercise-65ee5.firebasestorage.app",
  messagingSenderId: "949124057639",
  appId: "1:949124057639:web:2e3ccc86e33241a4fd1c02",
  measurementId: "G-YY11NRMSM5"
};

const SAVED_CONFIG_KEY = "exercise_firebase_custom_config";

export function getFirebaseConfig() {
  try {
    const saved = localStorage.getItem(SAVED_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {}

  return firebaseConfig;
}

export function saveFirebaseConfig(config) {
  try {
    localStorage.setItem(SAVED_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    return false;
  }
}

export function isFirebaseConfigured() {
  const cfg = getFirebaseConfig();
  return Boolean(cfg && cfg.apiKey && cfg.projectId === "exercise-65ee5");
}

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

try {
  const config = getFirebaseConfig();
  if (getApps().length === 0) {
    app = initializeApp(config);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  console.log("Firebase App & Firestore initialized successfully! 🚀");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { app, auth, db, googleProvider };
