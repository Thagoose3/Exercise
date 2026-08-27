/**
 * Firebase Configuration and Initialization
 * Connects Firebase Authentication (Google Sign-In) and Cloud Firestore.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Default / Stored Firebase configuration
const SAVED_CONFIG_KEY = "exercise_firebase_custom_config";

export function getFirebaseConfig() {
  // 1. Check if user provided custom config in app settings
  try {
    const saved = localStorage.getItem(SAVED_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {}

  // 2. Default Config Template (Paste your Firebase config here)
  return {
    apiKey: "AIzaSy_YOUR_API_KEY_HERE",
    authDomain: "exercise-app.firebaseapp.com",
    projectId: "exercise-app",
    storageBucket: "exercise-app.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
  };
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
  return Boolean(cfg && cfg.apiKey && !cfg.apiKey.includes("YOUR_API_KEY") && cfg.projectId !== "exercise-app");
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
} catch (error) {
  console.warn("Firebase initialization skipped or config placeholder active:", error.message);
}

export { app, auth, db, googleProvider };
