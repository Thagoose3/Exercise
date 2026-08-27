# 📋 บันทึกการอัปเดต (Patch Notes / Changelog)

ประวัติการพัฒนาและบันทึกการเปลี่ยนแปลงของเว็บแอปพลิเคชัน **Exercise Pro**

---

## 🚀 [v1.0.1] - 2026-08-27 (Current Release)

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

### 📊 Data Storage & Analytics
- **LocalStorage Engine:** เก็บบันทึกข้อมูลทั้งหมดในเครื่องของผู้ใช้แบบ 100% Client-Side เป็นส่วนตัว ปลอดภัย ไร้กังวล
- **Streak & Statistics Tracker:** ระบบคำนวณจำนวนวันออกกำลังกายต่อเนื่อง (Streak 🔥), จำนวนครั้งสะสม, เวลาสะสม และแคลอรี่ที่เผาผลาญ
- **Daily Set Progress Persistence:** บันทึกสถานะการติ๊กถูกเซตของแต่ละวัน รีเฟรชหน้าจอแล้วข้อมูลไม่หาย
- **Exercise Library Guide:** คลังคู่มือท่าออกกำลังกายทั้ง 12 ท่า พร้อมเป้าหมายกล้ามเนื้อ ขั้นตอนปฏิบัติ และเทคนิคความปลอดภัย (Pro-Tips)

### 🎨 UI & Responsive Design
- **Dark Sport Theme:** ดีไซน์สไตล์มืดคมชัดระดับพรีเมียม สบายตา เหมาะสำหรับเปิดในห้องออกกำลังกายหรือกลางแจ้ง
- **Responsive Layout:** ใช้งานได้อย่างสมบูรณ์แบบบนมือถือ (Mobile Bottom Bar) และคอมพิวเตอร์ (Top Navigation Bar)
- **Kanit & Prompt Typography:** ฟอนต์ภาษาไทยและอังกฤษคมชัด สวยงาม และอ่านง่ายในทุกขนาดหน้าจอ
- **Celebration Effects:** เอฟเฟกต์พลุ Confetti และเสียงฉลองเมื่อออกกำลังกายสำเร็จ
