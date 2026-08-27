# 📋 บันทึกการอัปเดต (Patch Notes / Changelog)

ประวัติการพัฒนาและบันทึกการเปลี่ยนแปลงของเว็บแอปพลิเคชัน **Exercise Pro**

---

## ✨ [v1.2.0] - 2026-08-27 (Minimalist UI & Mobile PWA Edition)

### 📱 Mobile PWA & App Icons (ไอคอนแอปและติดตั้งบนมือถือ)
- **App Icons:** สร้างชุดไอคอนแอปพลิเคชันความคมชัดสูง (`favicon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) ในธีม Dark Minimalist Flame & Lightning ⚡
- **PWA Web Manifest:** เพิ่มไฟล์ `manifest.json` รองรับการติดตั้งแบบ Standalone App บน iOS และ Android เต็มรูปแบบ ไม่มีแถบเบราว์เซอร์กวนใจ
- **Safe Area Insets:** รองรับขอบจอมือถือไร้ขอบ (iPhone Dynamic Island / Notch / Home Indicator) สบายตา

### 🎨 Minimalist UI/UX Redesign (ดีไซน์มินิมอล สะอาดตา ใช้งานง่าย)
- **Ultra-Clean Dark Palette:** ปรับโทนสีเป็น Deep Obsidian (`#090d16`) เสริมด้วยเส้นขอบบางเบา (`border-white/[0.05]`) และการจัดระยะที่โปร่งตา
- **Smooth Page Transitions:** เพิ่มระบบแอนิเมชันสลับหน้าแบบ Fade-in นุ่มนวล
- **Minimalist Loading State:** เพิ่มหน้าแสดงการโหลดสไตล์มินิมอล (`#appPageLoader` & `minimal-spinner`) เมื่อต้องประมวลผลหรือซิงค์ข้อมูล Cloud
- **Thumb-Friendly Touch Target:** ปรับขนาดปุ่มและการสัมผัสบนมือถือให้กดง่าย ไม่เมื่อยนิ้ว พร้อมเอฟเฟกต์การกด (`tap-active`) ที่ตอบสนองทันใจ

---

## ☁️ [v1.1.0] - 2026-08-27 (Major Cloud Release)

### 🚀 Google Authentication & Cloud Firestore (ระบบล็อกอินและฐานข้อมูล)
- **Google Sign-In:** เพิ่มปุ่มเข้าสู่ระบบด้วยบัญชี Google (One-Click Google Authentication) สะดวก รวดเร็ว ไม่ต้องจำรหัสผ่าน
- **Cloud Firestore Database Sync:** เชื่อมต่อฐานข้อมูล Cloud Firestore บันทึกประวัติการออกกำลังกาย, สถิติ Streak และการติ๊กเซตขึ้น Cloud อัตโนมัติ
- **Multi-Device Real-Time Sync:** ซิงค์ข้อมูลข้ามอุปกรณ์แบบเรียลไทม์ (Real-Time Listener) เล่นบนมือถือ ข้อมูลไปขึ้นบนคอมพิวเตอร์ทันที
- **Automatic Data Migration:** ระบบตรวจหาประวัติที่มีอยู่ในเครื่อง (LocalStorage) และอัปโหลดขึ้น Cloud ให้ทันทีเมื่อล็อกอิน ข้อมูลเดิมไม่สูญหาย
- **Hybrid Offline Mode:** หากไม่ล็อกอิน ระบบจะยังคงทำงานผ่าน LocalStorage ในเครื่องได้ตามปกติ 100%
- **In-App Firebase Setup Modal:** มีหน้าต่างตั้งค่า Firebase Config Keys ได้โดยตรงจากหน้าเว็บ

---

## 🚀 [v1.0.1] - 2026-08-27

### 🐛 Bug Fixes & Improvements (การแก้ไขบั๊กและปรับปรุงการทำงาน)
- **Fix HIIT Routine Selector:** แก้ไขข้อผิดพลาดเมื่อผู้ใช้เลือกดูตารางวันอื่น (เช่น วันศุกร์) จากหน้าตารางรายสัปดาห์ แล้วกดปุ่มเริ่ม HIIT ทำให้ตัวจับเวลาดึงข้อมูลท่าและเวลาของวันที่เลือกดูได้อย่างถูกต้อง 100% ไม่ติดขัด
- **State Synchronization:** ปรับปรุงการซิงค์ `currentlyDisplayedRoutine` และ `selectedDayId` ในตัวควบคุมหน้าจอ
- **Button Event Parameters:** ส่งค่า `r.id` เข้าสู่ฟังก์ชัน `launchHIITRoutine()` เพื่อความแม่นยำในการเรียกใช้ข้อมูล

### 📝 Documentation (เอกสารและการนำเสนอ)
- **Modern README.md:** ปรับปรุงเอกสารหน้าแรกให้อ่านง่าย สวยงาม มีตารางภาพรวมรายสัปดาห์ ตารางแยกท่า ดรอปดาวน์รายละเอียด และวิธีติดตั้งลงบนหน้าจอมือถือ (Add to Home Screen)
- **Patch Notes:** เพิ่มไฟล์ `PATCHNOTE.md` เพื่อบันทึกประวัติการอัปเดตของโปรเจกต์

---

## 🌟 [v1.0.0] - 2026-08-27 (Initial Release)

### 🎯 Core Features (ฟีเจอร์หลัก)
- **3-Day Dumbbell + HIIT Fat Loss Program:**
  - **วันจันทร์:** Upper Body & Core Strength + Core-HIIT (อก/ไหล่/แขน + ร่องหน้าท้อง)
  - **วันพุธ:** Lower Body & Glutes + Cardio-HIIT Burnout (เตาเผาขา/ก้น + Low-Impact HIIT)
  - **วันศุกร์:** Full Body Dumbbell Complex + Tabata Finisher (ฟูลบอดี้คอมเพล็กซ์ + Tabata 30s/15s)
- **Outdoor Walk Tracker (สวนเกษตร มข.):**
  - นาฬิกาจับเวลา 40–50 นาทีสำหรับการเดิน Zone 2 Cardio
  - ระบบแจ้งเตือน Milestone ทุกๆ 10 นาที (10m, 20m, 30m, 40m, 50m) พร้อมประเมินแคลอรี่สะสม
- **Rest & Active Recovery Guide:**
  - คำแนะนำการดื่มน้ำ การนอนหลับ และการยืดเหยียดกล้ามเนื้อสำหรับวันอังคารและวันอาทิตย์

### ⏱️ Smart Workout Timers & Audio System
- **Rest Timer:** นาฬิกาพักเซตแบบวงกลม (30s, 45s, 60s, 90s, +15s) เด้งขึ้นอัตโนมัติเมื่อติ๊กจบแต่ละเซต
- **Fullscreen HIIT Engine:** หน้าจอจับเวลาขนาดใหญ่ เปลี่ยนสีตามสถานะ (🔵 เตรียมตัว, 🟢 ออกกำลังกาย, 🟠 พัก) พร้อมระบบนับรอบและพรีวิวท่าถัดไป (Next Up)
- **Web Audio API Synthesizer:** เสียง Beep นับถอยหลัง 3-2-1 และเสียงเริ่มรอบ/จบรอบ คมชัด ทำงานแบบ Real-time โดยไม่ต้องโหลดไฟล์ MP3 ภายนอก
- **Thai Speech Synthesis (TTS):** เสียงพูดสังเคราะห์ภาษาไทยคอยบอกชื่อท่าและจังหวะพัก (สามารถเปิด/ปิดได้ตลอดเวลา)
- **Screen Wake Lock API:** ป้องกันหน้าจอมือถือดับเองขณะออกกำลังกาย
