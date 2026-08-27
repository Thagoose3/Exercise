/**
 * LocalStorage Workout History & Streak Manager
 */

const STORAGE_KEYS = {
  HISTORY: 'exercise_workout_history',
  SETTINGS: 'exercise_user_settings',
  DAILY_PROGRESS: 'exercise_today_progress'
};

export class StorageManager {
  static getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load history:", e);
      return [];
    }
  }

  static saveWorkoutLog(log) {
    try {
      const history = this.getHistory();
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
      history.unshift(newEntry);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
      return newEntry;
    } catch (e) {
      console.error("Failed to save log:", e);
      return null;
    }
  }

  static deleteLog(id) {
    try {
      const history = this.getHistory().filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
      return true;
    } catch (e) {
      return false;
    }
  }

  static clearAllHistory() {
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
          // allow 1 or 2 days gap for rest days in workout streak
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
   * Daily sets checklist persistence (so refreshing won't reset ticks)
   */
  static saveDailyProgress(dayId, progressData) {
    try {
      const key = `${STORAGE_KEYS.DAILY_PROGRESS}_${new Date().toISOString().split('T')[0]}_${dayId}`;
      localStorage.setItem(key, JSON.stringify(progressData));
    } catch (e) {}
  }

  static getDailyProgress(dayId) {
    try {
      const key = `${STORAGE_KEYS.DAILY_PROGRESS}_${new Date().toISOString().split('T')[0]}_${dayId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  static clearDailyProgress(dayId) {
    const key = `${STORAGE_KEYS.DAILY_PROGRESS}_${new Date().toISOString().split('T')[0]}_${dayId}`;
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
