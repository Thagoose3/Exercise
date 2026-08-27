/**
 * Main Application Orchestrator for Exercise Web App
 * Supports Google Authentication & Cloud Firestore Real-time Sync
 */

import { WORKOUT_ROUTINES, getRoutineForDay, getTodayRoutine } from './workoutData.js';
import { soundEngine, wakeLockManager, RestTimer, HIITEngine, OutdoorWalkTracker } from './timer.js';
import { StorageManager } from './storage.js';
import { authManager } from './authManager.js';
import { getFirebaseConfig, saveFirebaseConfig, isFirebaseConfigured } from './firebaseConfig.js';

class ExerciseApp {
  constructor() {
    this.currentDayRoutine = getTodayRoutine();
    this.currentlyDisplayedRoutine = this.currentDayRoutine;
    this.selectedDayId = this.currentDayRoutine.id;
    this.activeTab = 'today';
    this.unsubscribeCloud = null;

    // Engines
    this.restTimer = new RestTimer({
      duration: 45,
      onTick: (rem, total) => this.handleRestTick(rem, total),
      onComplete: () => this.handleRestComplete()
    });

    this.hiitEngine = new HIITEngine({
      onTick: (summary) => this.handleHIITTick(summary),
      onPhaseChange: (summary) => this.handleHIITPhaseChange(summary),
      onComplete: (summary) => this.handleHIITComplete(summary)
    });

    this.outdoorTracker = new OutdoorWalkTracker({
      targetMinutes: 45,
      onTick: (summary) => this.handleOutdoorTick(summary),
      onMilestone: (mins) => this.handleOutdoorMilestone(mins)
    });

    this.init();
  }

  init() {
    this.initLucide();
    this.setupDateHeader();
    this.setupSettings();
    this.setupAuthUI();
    this.setupTabNavigation();
    this.setupModals();
    this.setupTimersTab();
    this.renderTodayView();
    this.renderWeeklySchedule();
    this.renderExerciseGuide('all');
    this.renderStatsAndHistory();
  }

  initLucide() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  setupDateHeader() {
    const headerDateStr = document.getElementById('headerDateStr');
    if (!headerDateStr) return;

    const now = new Date();
    const daysTh = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const monthsTh = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    const dayName = daysTh[now.getDay()];
    const dateNum = now.getDate();
    const monthName = monthsTh[now.getMonth()];
    const yearTh = now.getFullYear() + 543;

    headerDateStr.textContent = `${dayName}ที่ ${dateNum} ${monthName} ${yearTh}`;
  }

  setupSettings() {
    const settings = StorageManager.getSettings();
    soundEngine.soundEnabled = settings.soundEnabled ?? true;
    soundEngine.voiceEnabled = settings.voiceEnabled ?? true;

    const btnToggleVoice = document.getElementById('btnToggleVoice');
    const btnToggleSound = document.getElementById('btnToggleSound');

    const updateBtnStyles = () => {
      if (btnToggleVoice) {
        btnToggleVoice.classList.toggle('text-emerald-400', soundEngine.voiceEnabled);
        btnToggleVoice.classList.toggle('text-slate-500', !soundEngine.voiceEnabled);
      }
      if (btnToggleSound) {
        btnToggleSound.classList.toggle('text-emerald-400', soundEngine.soundEnabled);
        btnToggleSound.classList.toggle('text-slate-500', !soundEngine.soundEnabled);
      }
    };
    updateBtnStyles();

    btnToggleVoice?.addEventListener('click', () => {
      soundEngine.voiceEnabled = !soundEngine.voiceEnabled;
      StorageManager.saveSettings({ ...StorageManager.getSettings(), voiceEnabled: soundEngine.voiceEnabled });
      updateBtnStyles();
      if (soundEngine.voiceEnabled) {
        soundEngine.speak("เปิดเสียงบรรยายแล้ว");
      }
    });

    btnToggleSound?.addEventListener('click', () => {
      soundEngine.soundEnabled = !soundEngine.soundEnabled;
      StorageManager.saveSettings({ ...StorageManager.getSettings(), soundEnabled: soundEngine.soundEnabled });
      updateBtnStyles();
      if (soundEngine.soundEnabled) {
        soundEngine.playWorkStartTone();
      }
    });
  }

  // =========================================================================
  // AUTHENTICATION & CLOUD SYNC UI
  // =========================================================================
  setupAuthUI() {
    const btnLoginGoogle = document.getElementById('btnLoginGoogle');
    const userProfileBadge = document.getElementById('userProfileBadge');
    const userAvatarImg = document.getElementById('userAvatarImg');
    const userNameText = document.getElementById('userNameText');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');
    const btnSignOut = document.getElementById('btnSignOut');
    const btnManualSyncCloud = document.getElementById('btnManualSyncCloud');
    const btnOpenFirebaseSettings = document.getElementById('btnOpenFirebaseSettings');
    const syncStatusIndicator = document.getElementById('syncStatusIndicator');

    // Subscribe to Auth state changes
    authManager.onAuthChange(async (user) => {
      if (user) {
        // User logged in
        if (btnLoginGoogle) btnLoginGoogle.classList.add('hidden');
        if (userProfileBadge) {
          userProfileBadge.classList.remove('hidden');
          userProfileBadge.classList.add('flex');
        }

        if (userAvatarImg) userAvatarImg.src = user.photoURL || 'https://www.gravatar.com/avatar/?d=mp';
        if (userNameText) userNameText.textContent = user.displayName?.split(' ')[0] || 'User';
        if (dropdownUserEmail) dropdownUserEmail.textContent = user.email || '';

        if (syncStatusIndicator) {
          syncStatusIndicator.innerHTML = `<i data-lucide="cloud" class="w-3 h-3 text-emerald-400"></i> ซิงค์กับ Cloud Firestore (Real-Time)`;
        }

        // Fetch cloud data and sync
        await StorageManager.fetchCloudHistory(user.uid);
        await StorageManager.syncLocalToCloud();
        this.renderStatsAndHistory();

        // Realtime listener
        if (this.unsubscribeCloud) this.unsubscribeCloud();
        this.unsubscribeCloud = StorageManager.subscribeToCloudUpdates((logs) => {
          this.renderStatsAndHistory();
        });
      } else {
        // User logged out
        if (btnLoginGoogle) btnLoginGoogle.classList.remove('hidden');
        if (userProfileBadge) {
          userProfileBadge.classList.add('hidden');
          userProfileBadge.classList.remove('flex');
        }
        if (userDropdownMenu) userDropdownMenu.classList.add('hidden');

        if (syncStatusIndicator) {
          syncStatusIndicator.innerHTML = `<i data-lucide="database" class="w-3 h-3 text-cyan-400"></i> บันทึกในเครื่อง (LocalStorage)`;
        }

        if (this.unsubscribeCloud) {
          this.unsubscribeCloud();
          this.unsubscribeCloud = null;
        }

        this.renderStatsAndHistory();
      }

      this.initLucide();
    });

    // Login button click
    btnLoginGoogle?.addEventListener('click', async () => {
      try {
        await authManager.signInWithGoogle();
        this.fireConfetti();
      } catch (err) {
        if (err.message === 'NOT_CONFIGURED') {
          // Open Firebase configuration modal if keys not entered yet
          this.openFirebaseConfigModal();
        } else {
          console.warn("Google sign-in error:", err);
          alert("ไม่สามารถเข้าสู่ระบบ Google ได้: " + (err.message || "โปรดตรวจสอบการตั้งค่า Firebase"));
        }
      }
    });

    // Toggle Dropdown
    userProfileBadge?.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdownMenu?.classList.toggle('hidden');
    });

    // Close Dropdown on outside click
    document.addEventListener('click', () => {
      userDropdownMenu?.classList.add('hidden');
    });

    // Sign Out
    btnSignOut?.addEventListener('click', async () => {
      if (confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
        await authManager.signOutUser();
        alert("ออกจากระบบเรียบร้อยแล้ว (แอปจะสลับไปใช้โหมดบันทึกลงในเครื่องตามปกติ)");
      }
    });

    // Manual Cloud Sync Button
    btnManualSyncCloud?.addEventListener('click', async () => {
      const count = await StorageManager.syncLocalToCloud();
      this.fireConfetti();
      alert(`☁️ ซิงค์ข้อมูลกับ Firebase สำเร็จเรียบร้อย! (อัปโหลดประวัติใหม่ ${count} รายการ)`);
      this.renderStatsAndHistory();
    });

    // Open Firebase Settings
    btnOpenFirebaseSettings?.addEventListener('click', () => {
      this.openFirebaseConfigModal();
    });
  }

  openFirebaseConfigModal() {
    const modal = document.getElementById('firebaseConfigModal');
    const cfg = getFirebaseConfig();

    const apiKeyInput = document.getElementById('fbInputApiKey');
    const authDomainInput = document.getElementById('fbInputAuthDomain');
    const projectIdInput = document.getElementById('fbInputProjectId');
    const appIdInput = document.getElementById('fbInputAppId');

    if (apiKeyInput && cfg.apiKey && !cfg.apiKey.includes('YOUR_API_KEY')) apiKeyInput.value = cfg.apiKey;
    if (authDomainInput && cfg.authDomain) authDomainInput.value = cfg.authDomain;
    if (projectIdInput && cfg.projectId && cfg.projectId !== 'exercise-app') projectIdInput.value = cfg.projectId;
    if (appIdInput && cfg.appId) appIdInput.value = cfg.appId;

    if (modal) modal.classList.remove('hidden');
  }

  showLoader(text = "กำลังซิงค์ข้อมูล...") {
    const loader = document.getElementById('appPageLoader');
    if (loader) {
      const textEl = loader.querySelector('span');
      if (textEl) textEl.textContent = text;
      loader.classList.remove('hidden');
      loader.classList.add('flex');
    }
  }

  hideLoader() {
    const loader = document.getElementById('appPageLoader');
    if (loader) {
      loader.classList.add('hidden');
      loader.classList.remove('flex');
    }
  }

  setupTabNavigation() {
    const navButtons = document.querySelectorAll('[data-tab]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabId) {
    if (this.activeTab === tabId) return;
    this.activeTab = tabId;

    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));

    // Show active tab with fadeIn
    const activeEl = document.getElementById(`tab-${tabId}`);
    if (activeEl) {
      activeEl.classList.remove('hidden');
    }

    // Update active nav styles
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('bg-emerald-500', isTarget);
      btn.classList.toggle('text-slate-950', isTarget);
      btn.classList.toggle('shadow-sm', isTarget);
      btn.classList.toggle('text-slate-400', !isTarget);
    });

    document.querySelectorAll('.nav-item').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('text-emerald-400', isTarget);
      btn.classList.toggle('active', isTarget);
      btn.classList.toggle('text-slate-400', !isTarget);
    });

    if (tabId === 'stats') {
      this.renderStatsAndHistory();
    }

    this.initLucide();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================================
  // TODAY'S VIEW RENDERING
  // =========================================================================
  renderTodayView(routine = null) {
    const r = routine || this.currentDayRoutine;
    this.currentlyDisplayedRoutine = r;
    this.selectedDayId = r.id;
    const container = document.getElementById('todayRoutineContainer');
    if (!container) return;

    const progress = StorageManager.getDailyProgress(r.id);

    let html = `
      <!-- Routine Hero Banner -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700/60 p-6 shadow-2xl">
        <div class="absolute -right-8 -bottom-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${r.badgeColor} text-white shadow-md">
              ${r.dayName}
            </span>
            <span class="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              ${r.tag}
            </span>
          </div>

          <div class="flex items-center gap-3 text-xs text-slate-300">
            <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5 text-cyan-400"></i> ${r.totalDuration}</span>
            <span class="flex items-center gap-1"><i data-lucide="flame" class="w-3.5 h-3.5 text-rose-400"></i> ${r.caloriesEstimate}</span>
          </div>
        </div>

        <h2 class="text-2xl sm:text-3xl font-black text-slate-50 tracking-tight mb-2">
          ${r.title}
        </h2>
        <p class="text-xs sm:text-sm text-slate-300 font-light leading-relaxed mb-4 max-w-2xl">
          ${r.overview}
        </p>

        <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          <span class="text-[11px] text-slate-400 flex items-center gap-1">
            <i data-lucide="sparkles" class="w-3 h-3 text-amber-400"></i> ${r.subtitle}
          </span>
        </div>
      </div>
    `;

    // 1. If it's a Rest Day
    if (r.isRestDay) {
      html += `
        <div class="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div class="flex items-center gap-3 text-indigo-400 font-bold text-lg">
            <span class="text-2xl">🛌</span> คำแนะนำการพักผ่อน & Active Recovery
          </div>
          <p class="text-xs text-slate-400">วันนี้เป็นวันพักผ่อนเพื่อให้กล้ามเนื้อได้ซ่อมแซมและเติบโตเต็มที่</p>

          <div class="space-y-2.5 pt-2">
            ${r.recoveryTips.map(tip => `
              <div class="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                <i data-lucide="check" class="w-4 h-4 text-indigo-400 shrink-0 mt-0.5"></i>
                <span>${tip}</span>
              </div>
            `).join('')}
          </div>

          <div class="pt-4 flex justify-center">
            <button onclick="window.app.completeWorkoutSession('${r.id}', '${r.title}', 0, 0, 'rest')" class="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2">
              <i data-lucide="check-circle" class="w-5 h-5"></i> บันทึกว่าได้พักผ่อนวันนี้
            </button>
          </div>
        </div>
      `;
      container.innerHTML = html;
      this.initLucide();
      return;
    }

    // 2. If it's Outdoor Walk Day (สวนเกษตร มข.)
    if (r.isOutdoorWalk) {
      html += `
        <div class="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5 text-teal-400 font-bold text-lg">
              <span class="text-2xl">🌳</span> เดินรับลม สวนเกษตร มข. (40–50 นาที)
            </div>
            <span class="text-xs px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">Zone 2 Cardio</span>
          </div>

          <div class="space-y-2.5">
            ${r.tipsList.map(tip => `
              <div class="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
                <i data-lucide="compass" class="w-4 h-4 text-teal-400 shrink-0 mt-0.5"></i>
                <span>${tip}</span>
              </div>
            `).join('')}
          </div>

          <!-- Integrated Outdoor Stopwatch Box -->
          <div class="p-6 bg-slate-900/90 rounded-2xl border border-slate-700/60 text-center space-y-4 shadow-xl">
            <div class="space-y-1">
              <span id="todayOutdoorDisplay" class="text-5xl sm:text-6xl font-black font-mono text-teal-400 tracking-tight">00:00</span>
              <p class="text-xs text-slate-400">เวลาเดินสะสม (เป้าหมาย 45 นาที)</p>
            </div>

            <div class="w-full h-3 bg-slate-800 rounded-full overflow-hidden max-w-md mx-auto">
              <div id="todayOutdoorBar" class="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300" style="width: 0%"></div>
            </div>

            <div class="flex justify-center gap-3 pt-2">
              <button id="btnTodayOutdoorStart" class="px-8 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 active:scale-98 transition-all flex items-center gap-2">
                <i data-lucide="play" class="w-4 h-4 fill-current"></i> <span>เริ่มจับเวลาเดิน</span>
              </button>
              <button id="btnTodayOutdoorReset" class="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">
                รีเซ็ต
              </button>
            </div>
          </div>

          <div class="pt-2">
            <button onclick="window.app.completeWorkoutSession('${r.id}', '${r.title}', 45, 220, 'outdoor_walk')" class="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-sm shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2">
              <i data-lucide="award" class="w-5 h-5"></i> บันทึกว่าเดินสำเร็จเรียบร้อย! 🎉
            </button>
          </div>
        </div>
      `;
      container.innerHTML = html;
      this.initLucide();
      this.bindTodayOutdoorEvents();
      return;
    }

    // 3. Dumbbell & HIIT Routines (Monday, Wednesday, Friday)
    // PART 1: DUMBBELL SECTION
    if (r.part1) {
      html += `
        <div class="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 class="text-lg font-bold text-slate-100 flex items-center gap-2">
                <i data-lucide="dumbbell" class="w-5 h-5 text-emerald-400"></i> ${r.part1.title}
              </h3>
              <p class="text-xs text-slate-400">${r.part1.description}</p>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
              ${r.part1.duration}
            </span>
          </div>

          <!-- Exercise List -->
          <div class="space-y-4">
      `;

      r.part1.exercises.forEach((ex, exIdx) => {
        const totalSets = ex.sets || (r.part1.totalSets || 3);
        html += `
          <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 hover:border-slate-700/80 transition-all">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 cursor-pointer" onclick="window.app.openExerciseDetail('${ex.id}')">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center border border-emerald-500/30">
                    ${exIdx + 1}
                  </span>
                  <h4 class="font-bold text-slate-100 text-sm sm:text-base hover:text-emerald-400 transition-colors">
                    ${ex.name}
                  </h4>
                </div>
                <p class="text-xs text-slate-400 mt-0.5 ml-8">${ex.thName}</p>
                <div class="flex items-center gap-3 mt-1.5 ml-8 text-[11px] text-slate-400">
                  <span class="text-emerald-400 font-semibold">${ex.sets ? `${ex.sets} เซต x ` : ''}${ex.reps}</span>
                  ${ex.restSec ? `<span class="flex items-center gap-1"><i data-lucide="timer" class="w-3 h-3 text-cyan-400"></i> พัก ${ex.restSec}s</span>` : ''}
                </div>
              </div>

              <button onclick="window.app.openExerciseDetail('${ex.id}')" class="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-emerald-400 text-xs flex items-center gap-1">
                <i data-lucide="info" class="w-4 h-4"></i>
                <span class="hidden sm:inline text-[11px]">วิธีทำ</span>
              </button>
            </div>

            <!-- Set Checkboxes -->
            <div class="flex items-center gap-2 pt-1 border-t border-slate-800/80">
              <span class="text-[11px] text-slate-500 font-medium mr-1">เช็คเซต:</span>
              <div class="flex flex-wrap gap-2">
        `;

        for (let s = 1; s <= totalSets; s++) {
          const setKey = `${ex.id}_set_${s}`;
          const isChecked = progress[setKey] === true;
          const restTime = ex.restSec || r.part1.restBetweenSetsSec || 45;

          html += `
            <button 
              onclick="window.app.toggleSetCheck('${r.id}', '${setKey}', ${restTime})"
              id="btnSet_${setKey}"
              class="set-checkbox px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                isChecked 
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm' 
                  : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:border-slate-600'
              }"
            >
              <i data-lucide="${isChecked ? 'check' : 'circle'}" class="w-3.5 h-3.5"></i>
              <span>เซต ${s}</span>
            </button>
          `;
        }

        html += `
              </div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    // PART 2: HIIT SECTION
    if (r.part2) {
      html += `
        <div class="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 class="text-lg font-bold text-slate-100 flex items-center gap-2">
                <i data-lucide="zap" class="w-5 h-5 text-amber-400"></i> ${r.part2.title}
              </h3>
              <p class="text-xs text-amber-300/80 font-medium">${r.part2.formula}</p>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
              ${r.part2.duration}
            </span>
          </div>

          <!-- HIIT Exercise preview list -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            ${r.part2.exercises.map((ex, idx) => `
              <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-left space-y-1">
                <div class="flex items-center justify-between text-xs text-amber-400 font-bold">
                  <span>ท่าที่ ${idx + 1}</span>
                  <span>${ex.durationSec || r.part2.workSec}s</span>
                </div>
                <h5 class="font-bold text-slate-200 text-xs sm:text-sm line-clamp-1">${ex.name}</h5>
                <p class="text-[11px] text-slate-400 line-clamp-2">${ex.thName}</p>
              </div>
            `).join('')}
          </div>

          <!-- Big Start HIIT Button -->
          <div class="pt-2">
            <button onclick="window.app.launchHIITRoutine('${r.id}')" class="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2">
              <i data-lucide="play" class="w-5 h-5 fill-current"></i>
              <span>🚀 เริ่มจับเวลา HIIT สับไขมันอัตโนมัติ</span>
            </button>
          </div>
        </div>
      `;
    }

    // Complete Workout Button
    html += `
      <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 class="font-bold text-slate-200 text-sm">ทำครบตามตารางแล้วใช่ไหม?</h4>
          <p class="text-xs text-slate-400">กดบันทึกเพื่อเก็บสถิติความต่อเนื่อง (Streak) และประวัติ</p>
        </div>
        <button onclick="window.app.completeWorkoutSession('${r.id}', '${r.title}', 30, 260, 'combined')" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
          <i data-lucide="check-circle-2" class="w-4 h-4"></i> บันทึกการออกกำลังกายวันนี้ 🎉
        </button>
      </div>
    `;

    container.innerHTML = html;
    this.initLucide();
  }

  bindTodayOutdoorEvents() {
    const btnStart = document.getElementById('btnTodayOutdoorStart');
    const btnReset = document.getElementById('btnTodayOutdoorReset');

    btnStart?.addEventListener('click', () => {
      if (this.outdoorTracker.isRunning) {
        this.outdoorTracker.pause();
        btnStart.innerHTML = `<i data-lucide="play" class="w-4 h-4 fill-current"></i> <span>เดินต่อ</span>`;
        btnStart.classList.replace('bg-amber-500', 'bg-teal-500');
      } else {
        this.outdoorTracker.start();
        btnStart.innerHTML = `<i data-lucide="pause" class="w-4 h-4 fill-current"></i> <span>พักการเดิน</span>`;
        btnStart.classList.replace('bg-teal-500', 'bg-amber-500');
      }
      this.initLucide();
    });

    btnReset?.addEventListener('click', () => {
      this.outdoorTracker.reset();
      if (btnStart) {
        btnStart.innerHTML = `<i data-lucide="play" class="w-4 h-4 fill-current"></i> <span>เริ่มจับเวลาเดิน</span>`;
        btnStart.classList.remove('bg-amber-500');
        btnStart.classList.add('bg-teal-500');
      }
      this.initLucide();
    });
  }

  // =========================================================================
  // SET CHECK & REST TIMER
  // =========================================================================
  toggleSetCheck(dayId, setKey, restSec) {
    const progress = StorageManager.getDailyProgress(dayId);
    const newState = !progress[setKey];
    progress[setKey] = newState;
    StorageManager.saveDailyProgress(dayId, progress);

    const btn = document.getElementById(`btnSet_${setKey}`);
    if (btn) {
      btn.classList.toggle('bg-emerald-500', newState);
      btn.classList.toggle('text-slate-950', newState);
      btn.classList.toggle('border-emerald-500', newState);
      btn.classList.toggle('bg-slate-800/90', !newState);
      btn.classList.toggle('text-slate-300', !newState);
      btn.classList.toggle('border-slate-700', !newState);
      btn.innerHTML = `<i data-lucide="${newState ? 'check' : 'circle'}" class="w-3.5 h-3.5"></i> <span>${btn.innerText.trim()}</span>`;
      this.initLucide();
    }

    // If checked, trigger Rest Timer automatically
    if (newState) {
      this.showFloatingRestTimer(restSec);
    }
  }

  showFloatingRestTimer(seconds = 45) {
    const modal = document.getElementById('restTimerFloatingModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    this.restTimer.start(seconds);
  }

  handleRestTick(remaining, total) {
    const display = document.getElementById('floatingRestSecDisplay');
    const quickDisplay = document.getElementById('quickRestDisplay');
    if (display) display.textContent = remaining;
    if (quickDisplay) quickDisplay.textContent = remaining;
  }

  handleRestComplete() {
    const modal = document.getElementById('restTimerFloatingModal');
    if (modal) modal.classList.add('hidden');
  }

  startManualRest(seconds) {
    this.showFloatingRestTimer(seconds);
  }

  // =========================================================================
  // HIIT ENGINE FULLSCREEN RUNNER
  // =========================================================================
  launchHIITRoutine(dayIdOrConfig = null) {
    let config = null;

    if (typeof dayIdOrConfig === 'string') {
      const routine = WORKOUT_ROUTINES[dayIdOrConfig] || this.currentlyDisplayedRoutine || this.currentDayRoutine;
      if (routine && routine.part2) {
        config = {
          workSec: routine.part2.workSec || 40,
          restSec: routine.part2.restSec || 20,
          rounds: routine.part2.rounds || 3,
          prepareSec: routine.part2.prepareSec || 10,
          exercises: routine.part2.exercises
        };
      }
    } else if (dayIdOrConfig && typeof dayIdOrConfig === 'object') {
      config = dayIdOrConfig;
    } else {
      const routine = this.currentlyDisplayedRoutine || this.currentDayRoutine;
      if (routine && routine.part2) {
        config = {
          workSec: routine.part2.workSec || 40,
          restSec: routine.part2.restSec || 20,
          rounds: routine.part2.rounds || 3,
          prepareSec: routine.part2.prepareSec || 10,
          exercises: routine.part2.exercises
        };
      }
    }

    if (!config || !config.exercises || config.exercises.length === 0) {
      alert("ไม่พบรายการท่าสำหรับ HIIT ในวันนี้");
      return;
    }

    const modal = document.getElementById('hiitModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    this.hiitEngine.loadConfig(config);
    this.hiitEngine.start();
  }

  handleHIITPhaseChange(summary) {
    const phaseBadge = document.getElementById('hiitPhaseBadge');
    const roundBadge = document.getElementById('hiitRoundBadge');
    const timerCircle = document.getElementById('hiitTimerCircle');
    const countNumber = document.getElementById('hiitCountdownNumber');
    const countLabel = document.getElementById('hiitCountdownLabel');
    const exName = document.getElementById('hiitExerciseName');
    const exDetail = document.getElementById('hiitExerciseDetail');
    const nextBox = document.getElementById('hiitNextUpBox');
    const nextName = document.getElementById('hiitNextExerciseName');
    const pauseBtn = document.getElementById('btnHIITPauseResume');

    if (!phaseBadge || !roundBadge) return;

    roundBadge.textContent = `รอบที่ ${summary.currentRound} / ${summary.totalRounds}`;

    if (summary.state === 'prepare') {
      phaseBadge.textContent = 'PREPARE';
      phaseBadge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/20';
      timerCircle.className = 'relative w-56 h-56 sm:w-64 sm:h-64 rounded-full flex items-center justify-center bg-slate-900/90 border-8 border-blue-500 shadow-2xl transition-all duration-300';
      countNumber.className = 'text-6xl sm:text-7xl font-black font-mono text-blue-400 tracking-tighter';
      countLabel.textContent = 'เตรียมตัว';
      exName.textContent = summary.currentExercise?.thName || summary.currentExercise?.name || 'เตรียมพร้อม';
      exDetail.textContent = 'ยืนประจำตำแหน่ง และสูดหายใจลึกๆ';
      if (nextBox) nextBox.classList.remove('hidden');
      if (nextName) nextName.textContent = summary.currentExercise?.name || '';
    } else if (summary.state === 'work') {
      phaseBadge.textContent = 'WORK 🔥';
      phaseBadge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 animate-pulse';
      timerCircle.className = 'relative w-56 h-56 sm:w-64 sm:h-64 rounded-full flex items-center justify-center bg-emerald-950/40 border-8 border-emerald-500 shadow-2xl transition-all duration-300 glow-emerald';
      countNumber.className = 'text-6xl sm:text-7xl font-black font-mono text-emerald-400 tracking-tighter';
      countLabel.textContent = 'ลุยให้สุด!';
      exName.textContent = summary.currentExercise?.thName || summary.currentExercise?.name;
      exDetail.textContent = summary.currentExercise?.instructions?.[0] || 'เคลื่อนไหวอย่างต่อเนื่องด้วยสปีดเต็มที่';
      if (nextBox) nextBox.classList.remove('hidden');
      if (nextName) nextName.textContent = summary.nextExercise?.thName || summary.nextExercise?.name || 'จบรอบ';
    } else if (summary.state === 'rest') {
      phaseBadge.textContent = 'REST 💧';
      phaseBadge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30';
      timerCircle.className = 'relative w-56 h-56 sm:w-64 sm:h-64 rounded-full flex items-center justify-center bg-amber-950/40 border-8 border-amber-500 shadow-2xl transition-all duration-300 glow-amber';
      countNumber.className = 'text-6xl sm:text-7xl font-black font-mono text-amber-400 tracking-tighter';
      countLabel.textContent = 'พักหายใจ';
      exName.textContent = `พัก 20 วินาที`;
      exDetail.textContent = `เตรียมตัวสำหรับท่าถัดไป: ${summary.nextExercise?.thName || summary.nextExercise?.name}`;
      if (nextBox) nextBox.classList.remove('hidden');
      if (nextName) nextName.textContent = summary.nextExercise?.thName || summary.nextExercise?.name;
    } else if (summary.state === 'paused') {
      phaseBadge.textContent = 'PAUSED';
      phaseBadge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-600 text-white';
      if (pauseBtn) {
        pauseBtn.innerHTML = `<i data-lucide="play" class="w-6 h-6 fill-current"></i><span>ลุยต่อ</span>`;
        pauseBtn.classList.replace('bg-emerald-500', 'bg-cyan-500');
      }
      this.initLucide();
      return;
    }

    if (pauseBtn) {
      pauseBtn.innerHTML = `<i data-lucide="pause" class="w-6 h-6 fill-current"></i><span>พักชั่วคราว</span>`;
      pauseBtn.classList.remove('bg-cyan-500');
      pauseBtn.classList.add('bg-emerald-500');
    }

    this.initLucide();
  }

  handleHIITTick(summary) {
    const countNumber = document.getElementById('hiitCountdownNumber');
    if (countNumber) {
      countNumber.textContent = summary.timeRemaining;
    }
  }

  handleHIITComplete(summary) {
    const modal = document.getElementById('hiitModal');
    if (modal) modal.classList.add('hidden');

    this.fireConfetti();
    alert("🎉 ยอดเยี่ยมมาก! คุณทำ HIIT สำเร็จครบทุกรอบแล้ว สดชื่นและเบิร์นไขมันเต็มเหนี่ยว!");
  }

  // =========================================================================
  // OUTDOOR WALK TICK HANDLERS
  // =========================================================================
  handleOutdoorTick(summary) {
    const outDisplay = document.getElementById('outdoorTimerDisplay');
    const outBar = document.getElementById('outdoorProgressBar');
    const outProgressText = document.getElementById('outdoorProgressText');
    const outCalories = document.getElementById('outdoorCaloriesText');

    if (outDisplay) outDisplay.textContent = summary.formattedTime;
    if (outBar) outBar.style.width = `${summary.progressPercentage}%`;
    if (outProgressText) outProgressText.textContent = `${summary.progressPercentage}% (${Math.floor(summary.elapsedSeconds / 60)}/45 นาที)`;
    if (outCalories) outCalories.textContent = summary.estimatedCalories;

    const todayDisplay = document.getElementById('todayOutdoorDisplay');
    const todayBar = document.getElementById('todayOutdoorBar');
    if (todayDisplay) todayDisplay.textContent = summary.formattedTime;
    if (todayBar) todayBar.style.width = `${summary.progressPercentage}%`;
  }

  handleOutdoorMilestone(mins) {
    console.log(`Outdoor walk milestone: ${mins} mins`);
  }

  // =========================================================================
  // WEEKLY SCHEDULE RENDERING
  // =========================================================================
  renderWeeklySchedule() {
    const grid = document.getElementById('weeklyScheduleGrid');
    if (!grid) return;

    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    let html = '';
    daysOrder.forEach(dayKey => {
      const routine = WORKOUT_ROUTINES[dayKey];
      const isToday = routine.id === this.currentDayRoutine.id;

      html += `
        <div class="p-4 rounded-2xl ${isToday ? 'bg-slate-800/90 border-emerald-500/50 shadow-lg' : 'bg-slate-900/60 border-slate-800'} border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-all">
          <div class="flex items-center gap-3">
            <span class="w-12 h-12 rounded-xl bg-gradient-to-tr ${routine.badgeColor} flex items-center justify-center text-white font-bold text-base shadow-md">
              ${routine.dayName.substring(3, 6)}
            </span>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-slate-100 text-sm sm:text-base">${routine.title}</h4>
                ${isToday ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">วันนี้</span>' : ''}
              </div>
              <p class="text-xs text-slate-400 mt-0.5">${routine.subtitle}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span class="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              ${routine.totalDuration}
            </span>
            <button onclick="window.app.selectScheduleDay('${routine.id}')" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-emerald-500 transition-all flex items-center gap-1.5">
              <span>เลือกดู</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;
    this.initLucide();
  }

  selectScheduleDay(dayId) {
    const routine = WORKOUT_ROUTINES[dayId];
    if (!routine) return;
    this.selectedDayId = dayId;
    this.renderTodayView(routine);
    this.switchTab('today');
  }

  // =========================================================================
  // EXERCISE GUIDE RENDERING
  // =========================================================================
  renderExerciseGuide(filter = 'all') {
    const grid = document.getElementById('guideCardsGrid');
    if (!grid) return;

    const allExercises = [];
    const seen = new Set();

    ['monday', 'wednesday', 'friday'].forEach(dayKey => {
      const r = WORKOUT_ROUTINES[dayKey];
      if (r.part1?.exercises) {
        r.part1.exercises.forEach(ex => {
          if (!seen.has(ex.id)) {
            seen.add(ex.id);
            allExercises.push({ ...ex, category: 'dumbbell' });
          }
        });
      }
      if (r.part2?.exercises) {
        r.part2.exercises.forEach(ex => {
          if (!seen.has(ex.id)) {
            seen.add(ex.id);
            allExercises.push({ ...ex, category: 'hiit' });
          }
        });
      }
    });

    const filtered = filter === 'all' ? allExercises : allExercises.filter(ex => ex.category === filter);

    let html = '';
    filtered.forEach(ex => {
      const isDb = ex.category === 'dumbbell';
      html += `
        <div onclick="window.app.openExerciseDetail('${ex.id}')" class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer space-y-2.5 transition-all group">
          <div class="flex items-start justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              isDb ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }">
              ${isDb ? 'DUMBBELL' : 'HIIT'}
            </span>
            <i data-lucide="chevron-right" class="w-4 h-4 text-slate-500 group-hover:text-slate-200 transition-colors"></i>
          </div>

          <div>
            <h4 class="font-bold text-slate-100 text-sm group-hover:text-emerald-400 transition-colors">${ex.name}</h4>
            <p class="text-xs text-slate-400">${ex.thName}</p>
          </div>

          <div class="flex flex-wrap gap-1 pt-1">
            ${(ex.targetMuscles || []).map(m => `
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">${m}</span>
            `).join('')}
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;
    this.initLucide();

    document.querySelectorAll('.guide-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.getAttribute('data-filter');
        document.querySelectorAll('.guide-filter-btn').forEach(b => {
          const active = b.getAttribute('data-filter') === f;
          b.className = `guide-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium ${
            active ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`;
        });
        this.renderExerciseGuide(f);
      });
    });
  }

  openExerciseDetail(exerciseId) {
    let targetEx = null;
    let category = 'DUMBBELL';

    ['monday', 'wednesday', 'friday'].forEach(dayKey => {
      const r = WORKOUT_ROUTINES[dayKey];
      const foundDb = r.part1?.exercises?.find(e => e.id === exerciseId);
      if (foundDb) {
        targetEx = foundDb;
        category = 'DUMBBELL';
      }
      const foundHiit = r.part2?.exercises?.find(e => e.id === exerciseId);
      if (foundHiit) {
        targetEx = foundHiit;
        category = 'HIIT CARDIO';
      }
    });

    if (!targetEx) return;

    const modal = document.getElementById('exerciseDetailModal');
    const badge = document.getElementById('modalExTypeBadge');
    const title = document.getElementById('modalExTitle');
    const thTitle = document.getElementById('modalExThTitle');
    const muscles = document.getElementById('modalExMuscles');
    const steps = document.getElementById('modalExSteps');
    const tipsText = document.getElementById('modalExTipsText');

    if (badge) badge.textContent = category;
    if (title) title.textContent = targetEx.name;
    if (thTitle) thTitle.textContent = targetEx.thName;

    if (muscles) {
      muscles.innerHTML = (targetEx.targetMuscles || []).map(m => `
        <span class="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-emerald-300 font-medium">
          ${m}
        </span>
      `).join('');
    }

    if (steps) {
      steps.innerHTML = (targetEx.instructions || [
        'รักษาระนาบหลังให้ตรงและเกร็งหน้าท้องตลอดการเคลื่อนไหว',
        'ควบคุมจังหวะการยกและการผ่อน ไม่กระชาก',
        'หายใจเข้าเมื่อผ่อน หายใจออกเมื่อออกแรงยก'
      ]).map(s => `<li>${s}</li>`).join('');
    }

    if (tipsText) {
      tipsText.textContent = targetEx.tips || 'เกร็งกล้ามเนื้อแกนกลางลำตัวตลอดเวลา และรักษาระดับการหายใจให้สม่ำเสมอ';
    }

    if (modal) modal.classList.remove('hidden');
    this.initLucide();
  }

  // =========================================================================
  // STATS & HISTORY
  // =========================================================================
  renderStatsAndHistory() {
    const stats = StorageManager.getStats();
    const history = StorageManager.getHistory();

    const streakEl = document.getElementById('statStreakDays');
    const workoutsEl = document.getElementById('statTotalWorkouts');
    const minsEl = document.getElementById('statTotalMinutes');
    const calsEl = document.getElementById('statTotalCalories');
    const historyList = document.getElementById('workoutHistoryList');

    if (streakEl) streakEl.textContent = stats.currentStreak;
    if (workoutsEl) workoutsEl.textContent = stats.totalWorkouts;
    if (minsEl) minsEl.textContent = stats.totalMinutes;
    if (calsEl) calsEl.textContent = stats.totalCalories;

    if (!historyList) return;

    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="py-8 text-center text-slate-500 text-xs">
          <i data-lucide="clipboard-list" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
          ยังไม่มีประวัติการออกกำลังกาย เริ่มต้นบันทึกวันแรกของคุณวันนี้เลย!
        </div>
      `;
      this.initLucide();
      return;
    }

    let html = '';
    history.forEach(item => {
      html += `
        <div class="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              ✓
            </div>
            <div>
              <h5 class="font-bold text-slate-200 text-xs sm:text-sm">${item.title}</h5>
              <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span>${item.date}</span>
                <span>•</span>
                <span class="text-cyan-400">${item.durationMinutes} นาที</span>
                <span>•</span>
                <span class="text-rose-400">${item.caloriesBurned} kcal</span>
              </div>
            </div>
          </div>

          <button onclick="window.app.deleteHistoryItem('${item.id}')" class="p-2 text-slate-500 hover:text-rose-400 transition-colors" title="ลบรายการ">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      `;
    });

    historyList.innerHTML = html;
    this.initLucide();
  }

  async deleteHistoryItem(id) {
    if (confirm("คุณต้องการลบประวัติรายการนี้ใช่หรือไม่?")) {
      await StorageManager.deleteLog(id);
      this.renderStatsAndHistory();
    }
  }

  async completeWorkoutSession(dayId, title, durationMinutes = 30, caloriesBurned = 260, type = 'combined') {
    await StorageManager.saveWorkoutLog({
      dayId,
      title,
      durationMinutes,
      caloriesBurned,
      type
    });

    this.fireConfetti();
    soundEngine.playCompleteChime();
    soundEngine.speak("สุดยอดมาก! บันทึกประวัติการออกกำลังกายเรียบร้อย ร่างกายแข็งแรงขึ้นอีกขั้นแล้ว");

    alert(`🎉 เยี่ยมยอดมาก!\nบันทึกการออกกำลังกาย "${title}" เรียบร้อยแล้ว\nเผาผลาญไปประมาณ ${caloriesBurned} kcal!`);
    this.renderStatsAndHistory();
  }

  fireConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }

  // =========================================================================
  // SETUP MODAL EVENTS & TIMERS TAB
  // =========================================================================
  setupModals() {
    // HIIT Modal Controls
    document.getElementById('btnExitHIIT')?.addEventListener('click', () => {
      if (confirm("ต้องการออกจากการจับเวลา HIIT หรือไม่?")) {
        this.hiitEngine.reset();
        document.getElementById('hiitModal')?.classList.add('hidden');
      }
    });

    document.getElementById('btnHIITPauseResume')?.addEventListener('click', () => {
      if (this.hiitEngine.state === 'paused') {
        this.hiitEngine.resume();
      } else {
        this.hiitEngine.pause();
      }
    });

    document.getElementById('btnHIITSkip')?.addEventListener('click', () => {
      this.hiitEngine.skipNext();
    });

    // Rest Modal Controls
    document.getElementById('btnCloseRestModal')?.addEventListener('click', () => {
      this.restTimer.stop();
      document.getElementById('restTimerFloatingModal')?.classList.add('hidden');
    });

    document.getElementById('btnFloatingAdd15')?.addEventListener('click', () => {
      this.restTimer.addSeconds(15);
    });

    document.getElementById('btnFloatingSkipRest')?.addEventListener('click', () => {
      this.restTimer.complete();
    });

    // Exercise Detail Modal Close
    document.getElementById('btnCloseExDetail')?.addEventListener('click', () => {
      document.getElementById('exerciseDetailModal')?.classList.add('hidden');
    });
    document.getElementById('btnModalExCloseBottom')?.addEventListener('click', () => {
      document.getElementById('exerciseDetailModal')?.classList.add('hidden');
    });

    // Firebase Config Modal Close & Save
    document.getElementById('btnCloseFirebaseModal')?.addEventListener('click', () => {
      document.getElementById('firebaseConfigModal')?.classList.add('hidden');
    });

    document.getElementById('btnSaveFirebaseConfig')?.addEventListener('click', () => {
      const apiKey = document.getElementById('fbInputApiKey')?.value.trim();
      const authDomain = document.getElementById('fbInputAuthDomain')?.value.trim();
      const projectId = document.getElementById('fbInputProjectId')?.value.trim();
      const appId = document.getElementById('fbInputAppId')?.value.trim();

      if (!apiKey || !projectId) {
        alert("กรุณากรอก apiKey และ projectId ให้ครบถ้วน");
        return;
      }

      saveFirebaseConfig({
        apiKey,
        authDomain: authDomain || `${projectId}.firebaseapp.com`,
        projectId,
        storageBucket: `${projectId}.appspot.com`,
        messagingSenderId: "1234567890",
        appId: appId || "1:1234567890:web:abcdef"
      });

      alert("บันทึกการตั้งค่า Firebase สำเร็จ! ระบบจะทำการรีเฟรชหน้าจอเพื่อเริ่มต้นใช้งาน");
      window.location.reload();
    });

    // Clear History Button
    document.getElementById('btnClearHistory')?.addEventListener('click', async () => {
      if (confirm("คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติการออกกำลังกายทั้งหมด?")) {
        await StorageManager.clearAllHistory();
        this.renderStatsAndHistory();
      }
    });
  }

  setupTimersTab() {
    // Quick Rest Timer in Timers tab
    document.getElementById('btnStopQuickRest')?.addEventListener('click', () => {
      this.restTimer.stop();
      const disp = document.getElementById('quickRestDisplay');
      if (disp) disp.textContent = '0';
    });

    document.getElementById('btnAdd15QuickRest')?.addEventListener('click', () => {
      this.restTimer.addSeconds(15);
    });

    // Custom HIIT Start Button
    document.getElementById('btnStartCustomHIIT')?.addEventListener('click', () => {
      const workSec = parseInt(document.getElementById('customWorkInput')?.value || '40', 10);
      const restSec = parseInt(document.getElementById('customRestInput')?.value || '20', 10);
      const rounds = parseInt(document.getElementById('customRoundsInput')?.value || '3', 10);

      const customConfig = {
        workSec,
        restSec,
        rounds,
        prepareSec: 10,
        exercises: [
          { name: "Interval Work (รอบที่ 1)", thName: "ออกกำลังกายตามที่คุณต้องการ", durationSec: workSec },
          { name: "Interval Work (รอบที่ 2)", thName: "รักษาจังหวะและสปีด", durationSec: workSec },
          { name: "Interval Work (รอบที่ 3)", thName: "ใส่เต็มที่ก่อนจบรอบ", durationSec: workSec }
        ]
      };

      this.launchHIITRoutine(customConfig);
    });

    // Outdoor Dedicated Tab Buttons
    const btnOutStart = document.getElementById('btnOutdoorStartPause');
    const btnOutReset = document.getElementById('btnOutdoorReset');

    btnOutStart?.addEventListener('click', () => {
      if (this.outdoorTracker.isRunning) {
        this.outdoorTracker.pause();
        btnOutStart.innerHTML = `<i data-lucide="play" class="w-4 h-4 fill-current"></i> เดินต่อ`;
        btnOutStart.classList.replace('bg-amber-500', 'bg-teal-500');
      } else {
        this.outdoorTracker.start();
        btnOutStart.innerHTML = `<i data-lucide="pause" class="w-4 h-4 fill-current"></i> พักการเดิน`;
        btnOutStart.classList.replace('bg-teal-500', 'bg-amber-500');
      }
      this.initLucide();
    });

    btnOutReset?.addEventListener('click', () => {
      this.outdoorTracker.reset();
      if (btnOutStart) {
        btnOutStart.innerHTML = `<i data-lucide="play" class="w-4 h-4 fill-current"></i> เริ่มเดิน`;
        btnOutStart.classList.remove('bg-amber-500');
        btnOutStart.classList.add('bg-teal-500');
      }
      this.initLucide();
    });
  }
}

// Instantiate and attach to window
window.addEventListener('DOMContentLoaded', () => {
  window.app = new ExerciseApp();
});
