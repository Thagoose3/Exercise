/**
 * Audio Synthesizer, Screen Wake Lock & Workout Timer Engine
 * Zero external audio dependencies - uses Web Audio API & Web Speech Synthesis.
 */

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.voiceEnabled = true;
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTone(frequency, durationMs, type = 'sine', volume = 0.3) {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationMs / 1000);
    } catch (e) {
      console.warn("Audio play error:", e);
    }
  }

  playCountdownTick() {
    this.playTone(880, 120, 'sine', 0.25);
  }

  playWorkStartTone() {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      // Double high beep
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.frequency.setValueAtTime(1046.5, now); // C6
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.frequency.setValueAtTime(1318.5, now + 0.15); // E6
      gain2.gain.setValueAtTime(0.4, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.4);
    } catch (e) {}
  }

  playRestTone() {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      // Descending tone for rest
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.3); // A4
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  playCompleteChime() {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = this.audioCtx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.3, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.5);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.5);
      });
    } catch (e) {}
  }

  speak(text) {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  }
}

export const soundEngine = new SoundEngine();

/**
 * Screen Wake Lock API Manager
 */
class WakeLockManager {
  constructor() {
    this.wakeLock = null;
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('Screen Wake Lock acquired');
      } catch (err) {
        console.warn(`Wake Lock Error: ${err.name}, ${err.message}`);
      }
    }
  }

  releaseWakeLock() {
    if (this.wakeLock !== null) {
      this.wakeLock.release().then(() => {
        this.wakeLock = null;
        console.log('Screen Wake Lock released');
      }).catch(() => {});
    }
  }
}

export const wakeLockManager = new WakeLockManager();

/**
 * Rest Timer for Between Sets (Dumbbells)
 */
export class RestTimer {
  constructor(options = {}) {
    this.totalSeconds = options.duration || 45;
    this.remainingSeconds = this.totalSeconds;
    this.isRunning = false;
    this.timerId = null;
    this.onTick = options.onTick || (() => {});
    this.onComplete = options.onComplete || (() => {});
  }

  start(seconds = null) {
    if (seconds) {
      this.totalSeconds = seconds;
      this.remainingSeconds = seconds;
    }
    this.stop();
    this.isRunning = true;
    soundEngine.initAudio();
    wakeLockManager.requestWakeLock();

    this.onTick(this.remainingSeconds, this.totalSeconds);

    this.timerId = setInterval(() => {
      this.remainingSeconds--;
      if (this.remainingSeconds <= 3 && this.remainingSeconds > 0) {
        soundEngine.playCountdownTick();
      }
      this.onTick(this.remainingSeconds, this.totalSeconds);

      if (this.remainingSeconds <= 0) {
        this.complete();
      }
    }, 1000);
  }

  addSeconds(secs = 15) {
    this.remainingSeconds += secs;
    this.totalSeconds += secs;
    this.onTick(this.remainingSeconds, this.totalSeconds);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
  }

  complete() {
    this.stop();
    soundEngine.playWorkStartTone();
    soundEngine.speak("หมดเวลาพัก ลุยเซตต่อไป!");
    this.onComplete();
  }
}

/**
 * Advanced HIIT / Tabata Interval Engine
 */
export class HIITEngine {
  constructor(config = {}) {
    this.config = config; // { workSec, restSec, rounds, prepareSec, exercises: [...] }
    this.state = 'idle'; // 'idle' | 'prepare' | 'work' | 'rest' | 'completed' | 'paused'
    this.previousState = 'idle';
    this.currentRound = 1;
    this.currentExerciseIndex = 0;
    this.timeRemaining = 0;
    this.totalIntervalTime = 0;
    this.timerId = null;

    // Callbacks
    this.onTick = config.onTick || (() => {});
    this.onPhaseChange = config.onPhaseChange || (() => {});
    this.onComplete = config.onComplete || (() => {});
  }

  loadConfig(config) {
    this.reset();
    this.config = config;
  }

  getCurrentExercise() {
    if (!this.config.exercises || this.config.exercises.length === 0) return null;
    return this.config.exercises[this.currentExerciseIndex];
  }

  getNextExercise() {
    if (!this.config.exercises) return null;
    const nextIdx = (this.currentExerciseIndex + 1) % this.config.exercises.length;
    return this.config.exercises[nextIdx];
  }

  start() {
    soundEngine.initAudio();
    wakeLockManager.requestWakeLock();
    this.currentRound = 1;
    this.currentExerciseIndex = 0;

    const prepTime = this.config.prepareSec || 10;
    this.setPhase('prepare', prepTime);
    soundEngine.speak(`เตรียมตัว ท่าแรก ${this.getCurrentExercise()?.thName || ''}`);
    this.runLoop();
  }

  setPhase(phase, duration) {
    this.state = phase;
    this.timeRemaining = duration;
    this.totalIntervalTime = duration;
    this.onPhaseChange(this.getSummary());
  }

  runLoop() {
    if (this.timerId) clearInterval(this.timerId);
    this.onTick(this.getSummary());

    this.timerId = setInterval(() => {
      if (this.state === 'paused' || this.state === 'idle' || this.state === 'completed') return;

      this.timeRemaining--;

      // Audio ticks
      if (this.timeRemaining <= 3 && this.timeRemaining > 0) {
        soundEngine.playCountdownTick();
      }

      this.onTick(this.getSummary());

      if (this.timeRemaining <= 0) {
        this.nextPhase();
      }
    }, 1000);
  }

  nextPhase() {
    const curEx = this.getCurrentExercise();
    const totalExercises = this.config.exercises.length;

    if (this.state === 'prepare') {
      // Switch from prepare to work
      const workTime = curEx.durationSec || this.config.workSec || 40;
      this.setPhase('work', workTime);
      soundEngine.playWorkStartTone();
      soundEngine.speak(`เริ่มเลย! ${curEx.thName || curEx.name}`);
    } else if (this.state === 'work') {
      // Check if last exercise in last round
      const isLastExercise = this.currentExerciseIndex === totalExercises - 1;
      const isLastRound = this.currentRound >= this.config.rounds;

      if (isLastExercise && isLastRound) {
        this.finish();
        return;
      }

      // Switch to rest
      const restTime = this.config.restSec || 20;
      this.setPhase('rest', restTime);
      soundEngine.playRestTone();
      const nextEx = this.getNextExercise();
      soundEngine.speak(`พักได้ ท่าถัดไป ${nextEx?.thName || nextEx?.name}`);
    } else if (this.state === 'rest') {
      // Switch from rest to next work exercise or next round
      this.currentExerciseIndex++;
      if (this.currentExerciseIndex >= totalExercises) {
        this.currentExerciseIndex = 0;
        this.currentRound++;
      }

      const nextEx = this.getCurrentExercise();
      const workTime = nextEx.durationSec || this.config.workSec || 40;
      this.setPhase('work', workTime);
      soundEngine.playWorkStartTone();
      soundEngine.speak(`รอบที่ ${this.currentRound} ${nextEx.thName || nextEx.name}`);
    }
  }

  pause() {
    if (this.state !== 'paused' && this.state !== 'completed') {
      this.previousState = this.state;
      this.state = 'paused';
      this.onPhaseChange(this.getSummary());
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = this.previousState;
      this.onPhaseChange(this.getSummary());
    }
  }

  skipNext() {
    this.nextPhase();
  }

  reset() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
    this.state = 'idle';
    this.currentRound = 1;
    this.currentExerciseIndex = 0;
    this.timeRemaining = 0;
    wakeLockManager.releaseWakeLock();
    this.onPhaseChange(this.getSummary());
  }

  finish() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
    this.state = 'completed';
    soundEngine.playCompleteChime();
    soundEngine.speak("ยอดเยี่ยมมาก! คุณทำ HIIT ครบทุกท่าแล้ว");
    wakeLockManager.releaseWakeLock();
    this.onPhaseChange(this.getSummary());
    this.onComplete(this.getSummary());
  }

  getSummary() {
    return {
      state: this.state,
      timeRemaining: this.timeRemaining,
      totalIntervalTime: this.totalIntervalTime,
      currentRound: this.currentRound,
      totalRounds: this.config.rounds || 3,
      currentExercise: this.getCurrentExercise(),
      nextExercise: this.getNextExercise(),
      currentExerciseIndex: this.currentExerciseIndex,
      totalExercises: this.config.exercises?.length || 0
    };
  }
}

/**
 * Outdoor Walk Stopwatch Tracker
 */
export class OutdoorWalkTracker {
  constructor(options = {}) {
    this.targetMinutes = options.targetMinutes || 45;
    this.elapsedSeconds = 0;
    this.isRunning = false;
    this.timerId = null;
    this.onTick = options.onTick || (() => {});
    this.onMilestone = options.onMilestone || (() => {});
  }

  start() {
    soundEngine.initAudio();
    wakeLockManager.requestWakeLock();
    this.isRunning = true;
    this.timerId = setInterval(() => {
      this.elapsedSeconds++;
      this.onTick(this.getSummary());

      // Milestones every 10 mins (600s)
      if (this.elapsedSeconds > 0 && this.elapsedSeconds % 600 === 0) {
        const mins = Math.floor(this.elapsedSeconds / 60);
        soundEngine.playCompleteChime();
        soundEngine.speak(`เดินครบ ${mins} นาทีแล้ว เยี่ยมมาก สดชื่นต่อไป!`);
        this.onMilestone(mins);
      }
    }, 1000);
  }

  pause() {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  reset() {
    this.pause();
    this.elapsedSeconds = 0;
    wakeLockManager.releaseWakeLock();
    this.onTick(this.getSummary());
  }

  getSummary() {
    const mins = Math.floor(this.elapsedSeconds / 60);
    const secs = this.elapsedSeconds % 60;
    const progress = Math.min(100, Math.round((this.elapsedSeconds / (this.targetMinutes * 60)) * 100));
    // Estimate calories: ~4.5 kcal / min of brisk walking (average 60-70kg person)
    const estimatedCalories = Math.round(this.elapsedSeconds * (4.5 / 60));

    return {
      elapsedSeconds: this.elapsedSeconds,
      formattedTime: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
      targetMinutes: this.targetMinutes,
      progressPercentage: progress,
      estimatedCalories,
      isRunning: this.isRunning
    };
  }
}
