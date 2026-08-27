/**
 * Hybrid Storage Manager: Cloud Firestore + LocalStorage
 * Seamlessly synchronizes workout logs, streaks, and set progress.
 */

import { db, isFirebaseConfigured } from "./firebaseConfig.js";
import { authManager } from "./authManager.js";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const STORAGE_KEYS = {
  HISTORY: 'exercise_workout_history',
  SETTINGS: 'exercise_user_settings',
  DAILY_PROGRESS: 'exercise_today_progress',
  LAST_SYNC: 'exercise_last_cloud_sync'
};

export class StorageManager {
  static getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load local history:", e);
      return [];
    }
  }

  static setLocalHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {}
  }

  /**
   * Save a workout session log (Cloud Firestore + LocalStorage)
   */
  static async saveWorkoutLog(log) {
    const newEntry = {
      id: 'log_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      title: log.title || 'ออกกำลังกายสำเร็จ',
      dayId: log.dayId || 'custom',
      durationMinutes: log.durationMinutes || 25,
      caloriesBurned: log.caloriesBurned || 250,
      type: log.type || 'combined',
      note: log.note || ''
    };

    // 1. Save to LocalStorage immediately (instant response)
    const history = this.getHistory();
    history.unshift(newEntry);
    this.setLocalHistory(history);

    // 2. If logged in with Firebase, save to Cloud Firestore
    const user = authManager.getCurrentUser();
    if (user && db && isFirebaseConfigured()) {
      try {
        const logRef = doc(db, "users", user.uid, "workouts", newEntry.id);
        await setDoc(logRef, newEntry);

        // Update stats summary in Cloud
        const stats = this.getStats();
        const statsRef = doc(db, "users", user.uid, "stats", "summary");
        await setDoc(statsRef, {
          ...stats,
          lastUpdated: Date.now(),
          userEmail: user.email,
          userName: user.displayName || 'User'
        }, { merge: true });

        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        console.log("Workout log saved to Cloud Firestore!");
      } catch (cloudErr) {
        console.warn("Failed to write to Cloud Firestore (offline?):", cloudErr);
      }
    }

    return newEntry;
  }

  /**
   * Fetch all logs from Cloud Firestore
   */
  static async fetchCloudHistory(uid = null) {
    const user = uid ? { uid } : authManager.getCurrentUser();
    if (!user || !db || !isFirebaseConfigured()) {
      return this.getHistory();
    }

    try {
      const q = query(
        collection(db, "users", user.uid, "workouts"),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      const cloudHistory = [];
      snapshot.forEach(docSnap => {
        cloudHistory.push(docSnap.data());
      });

      if (cloudHistory.length > 0) {
        this.setLocalHistory(cloudHistory);
      }
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      return cloudHistory;
    } catch (e) {
      console.warn("Could not fetch cloud history, using local:", e);
      return this.getHistory();
    }
  }

  /**
   * Realtime Listener for multi-device live sync
   */
  static subscribeToCloudUpdates(callback) {
    const user = authManager.getCurrentUser();
    if (!user || !db || !isFirebaseConfigured()) return () => {};

    try {
      const q = query(
        collection(db, "users", user.uid, "workouts"),
        orderBy("timestamp", "desc")
      );

      return onSnapshot(q, (snapshot) => {
        const updatedLogs = [];
        snapshot.forEach(docSnap => {
          updatedLogs.push(docSnap.data());
        });
        this.setLocalHistory(updatedLogs);
        callback(updatedLogs);
      }, (err) => {
        console.warn("Snapshot error:", err);
      });
    } catch (e) {
      return () => {};
    }
  }

  /**
   * Migrate existing local device data up to Cloud Firestore
   */
  static async syncLocalToCloud() {
    const user = authManager.getCurrentUser();
    if (!user || !db || !isFirebaseConfigured()) return 0;

    const localHistory = this.getHistory();
    if (localHistory.length === 0) return 0;

    let syncedCount = 0;
    try {
      for (const item of localHistory) {
        const docRef = doc(db, "users", user.uid, "workouts", item.id);
        const existing = await getDoc(docRef);
        if (!existing.exists()) {
          await setDoc(docRef, item);
          syncedCount++;
        }
      }

      // Update cloud stats
      const stats = this.getStats();
      const statsRef = doc(db, "users", user.uid, "stats", "summary");
      await setDoc(statsRef, {
        ...stats,
        lastUpdated: Date.now(),
        userEmail: user.email,
        userName: user.displayName || 'User'
      }, { merge: true });

      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      return syncedCount;
    } catch (e) {
      console.error("Migration to Cloud error:", e);
      return syncedCount;
    }
  }

  /**
   * Delete workout log
   */
  static async deleteLog(id) {
    try {
      // 1. Remove from local
      const history = this.getHistory().filter(item => item.id !== id);
      this.setLocalHistory(history);

      // 2. Remove from Cloud if logged in
      const user = authManager.getCurrentUser();
      if (user && db && isFirebaseConfigured()) {
        const docRef = doc(db, "users", user.uid, "workouts", id);
        await deleteDoc(docRef);

        // Update stats
        const stats = this.getStats();
        const statsRef = doc(db, "users", user.uid, "stats", "summary");
        await setDoc(statsRef, { ...stats, lastUpdated: Date.now() }, { merge: true });
      }

      return true;
    } catch (e) {
      console.error("Delete log error:", e);
      return false;
    }
  }

  static async clearAllHistory() {
    const user = authManager.getCurrentUser();
    if (user && db && isFirebaseConfigured()) {
      try {
        const history = this.getHistory();
        for (const item of history) {
          await deleteDoc(doc(db, "users", user.uid, "workouts", item.id));
        }
      } catch (e) {}
    }
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  }

  /**
   * Calculate current streak and statistics
   */
  static getStats() {
    const history = this.getHistory();
    const totalWorkouts = history.length;
    const totalMinutes = history.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const totalCalories = history.reduce((acc, curr) => acc + (curr.caloriesBurned || 0), 0);

    // Calculate streak
    const uniqueDates = [...new Set(history.map(item => item.date))].sort().reverse();
    let currentStreak = 0;
    
    if (uniqueDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let checkDate = uniqueDates[0] === today ? today : (uniqueDates[0] === yesterday ? yesterday : null);

      if (checkDate) {
        let expectedTime = new Date(checkDate).getTime();
        for (let i = 0; i < uniqueDates.length; i++) {
          const itemTime = new Date(uniqueDates[i]).getTime();
          const diffDays = Math.round((expectedTime - itemTime) / (1000 * 60 * 60 * 24));
          if (diffDays <= 2) {
            currentStreak++;
            expectedTime = itemTime;
          } else {
            break;
          }
        }
      }
    }

    return {
      totalWorkouts,
      totalMinutes,
      totalCalories,
      currentStreak
    };
  }

  /**
   * Daily sets checklist persistence
   */
  static async saveDailyProgress(dayId, progressData) {
    const today = new Date().toISOString().split('T')[0];
    const key = `${STORAGE_KEYS.DAILY_PROGRESS}_${today}_${dayId}`;

    try {
      localStorage.setItem(key, JSON.stringify(progressData));
    } catch (e) {}

    // Cloud sync daily progress
    const user = authManager.getCurrentUser();
    if (user && db && isFirebaseConfigured()) {
      try {
        const progRef = doc(db, "users", user.uid, "daily_progress", `${today}_${dayId}`);
        await setDoc(progRef, {
          date: today,
          dayId,
          progress: progressData,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {}
    }
  }

  static getDailyProgress(dayId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `${STORAGE_KEYS.DAILY_PROGRESS}_${today}_${dayId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  static clearDailyProgress(dayId) {
    const today = new Date().toISOString().split('T')[0];
    const key = `${STORAGE_KEYS.DAILY_PROGRESS}_${today}_${dayId}`;
    localStorage.removeItem(key);
  }

  /**
   * User Settings
   */
  static getSettings() {
    try {
      const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return settings ? JSON.parse(settings) : {
        soundEnabled: true,
        voiceEnabled: true,
        autoRestTimer: true,
        preferredRestSec: 45
      };
    } catch (e) {
      return {
        soundEnabled: true,
        voiceEnabled: true,
        autoRestTimer: true,
        preferredRestSec: 45
      };
    }
  }

  static saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {}
  }
}
