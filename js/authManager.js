/**
 * Firebase Authentication & User Session Manager
 */

import { auth, googleProvider, isFirebaseConfigured } from "./firebaseConfig.js";
import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.authListeners = [];
    this.isInitialized = false;

    this.init();
  }

  init() {
    if (!auth) {
      console.log("AuthManager: Firebase Auth not initialized.");
      return;
    }

    // Check redirect result on mobile
    getRedirectResult(auth)
      .then(result => {
        if (result && result.user) {
          this.currentUser = result.user;
          this.notifyListeners(this.currentUser);
        }
      })
      .catch(err => {
        console.warn("Redirect result error:", err);
      });

    // Observer for auth state changes
    onAuthStateChanged(auth, user => {
      this.currentUser = user;
      this.isInitialized = true;
      this.notifyListeners(user);
    });
  }

  onAuthChange(callback) {
    this.authListeners.push(callback);
    if (this.isInitialized) {
      callback(this.currentUser);
    }
  }

  notifyListeners(user) {
    this.authListeners.forEach(cb => {
      try {
        cb(user);
      } catch (e) {
        console.error("Auth listener error:", e);
      }
    });
  }

  async signInWithGoogle() {
    if (!isFirebaseConfigured() || !auth || !googleProvider) {
      throw new Error("NOT_CONFIGURED");
    }

    try {
      // First attempt popup sign-in
      const result = await signInWithPopup(auth, googleProvider);
      this.currentUser = result.user;
      return result.user;
    } catch (error) {
      // If popup was blocked on mobile devices, fallback to redirect
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          throw redirectError;
        }
      } else {
        throw error;
      }
    }
  }

  async signOutUser() {
    if (!auth) return;
    try {
      await signOut(auth);
      this.currentUser = null;
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isLoggedIn() {
    return Boolean(this.currentUser);
  }
}

export const authManager = new AuthManager();
