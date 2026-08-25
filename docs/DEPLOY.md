# DEPLOY.md

## Google Sheet + Apps Script  ✅ สร้างแล้ว 2026-08-25
- **บัญชี:** `daya06527@gmail.com` (ตัวเดียวกับ TJ Inventory)
- **ชีต "workout":** `1b6wQxMN5QQ6_qu7rNeju8z8NKie6wyJKHeHIrOBoOo8`
  · https://docs.google.com/spreadsheets/d/1b6wQxMN5QQ6_qu7rNeju8z8NKie6wyJKHeHIrOBoOo8
- **scriptId:** `1TD8fMzsNHlp9zZBj1CrC8XopZJUbAHsBBAWd9RHG0O0HFMwfDwKJjCWJ` (container-bound)
- **Web App `/exec`:**
  `https://script.google.com/macros/s/AKfycbzcxFZYCXG2RNeqG6MteHEdPhQr5W7HU0JBW7HXGqS8T_9jVhq3065cipCOMV8Zkj6Z/exec`
  Execute as: **Me** · Access: **Anyone** · deploy ล่าสุด **v8 (2026-08-25)**
  v8 = **ถอด `?action=progress` ออก** (read API สาธารณะที่ตอบสรุปสุขภาพ — ดู `docs/SCOPE.md`)
  + `seedProgram()` ไม่เขียนทับใบที่มีข้อมูลแล้ว · เหลือ action แค่ `ping` / `getProgram`
  ✅ Run ครบแล้วทั้ง `setup()` · `seedProgram()` (25 แถว) · `buildDashboard()`
  ⚠️ ทุกครั้งที่ deploy อัปเดตเลขเวอร์ชันบรรทัดนี้ให้ตรง (เช็คด้วย `clasp list-deployments`)

### สร้างครั้งแรกด้วย clasp (ทำไปแล้ว — บันทึกไว้เผื่อทำโปรเจกต์ใหม่)
```bash
cd gas/working
clasp create-script --type sheets --title "workout" --rootDir .   # สร้างชีต + สคริปต์ผูกกัน ในคำสั่งเดียว
```
⚠️ **`create-script` เขียนทับ `appsscript.json` ด้วยค่า default** (America/New_York, ไม่มี webapp)
ต้องเขียนกลับก่อน push ไม่งั้น deploy แล้วไม่เป็น web app

### วงจร deploy (ทุกครั้งที่แก้ .gs)
```bash
cd "/Users/tujas/Library/CloudStorage/OneDrive-ส่วนบุคคล/ออกกำลังกาย/gas/working"
clasp push -f
clasp create-version "<คำอธิบาย>"
clasp list-deployments
clasp update-deployment -V <เลขเวอร์ชัน> AKfycbzcxFZYCXG2RNeqG6MteHEdPhQr5W7HU0JBW7HXGqS8T_9jVhq3065cipCOMV8Zkj6Z
```
⚠️ **push ≠ deploy** — push แค่อัปโค้ดขึ้น editor · `/exec` ยังรันเวอร์ชันเก่าจนกว่าจะ update-deployment

⚠️ **แท็บ editor ไม่รีเฟรชเองหลัง `clasp push`** — ต้องกด `Cmd+R` ไม่งั้นจะไม่เห็นไฟล์ใหม่
และเมนูฟังก์ชันข้างปุ่ม Run จะยังเป็นรายการเก่า
· เช็คว่าโค้ดขึ้นไปจริงไหมโดยไม่ต้องพึ่งสายตา: `clasp pull` ลงโฟลเดอร์ชั่วคราวแล้ว grep ดู
· เกร็ด: ปุ่ม **Run** รันโค้ดที่**เซิร์ฟเวอร์** ไม่ใช่ข้อความที่แสดงในจอ — โค้ดใหม่จึงทำงาน
  ได้ถูกต้องอยู่แล้วแม้หน้าจอยังโชว์ของเก่า (เจอจริงตอน v3)

### 🔑 ขั้นตอนเดียวที่ CLI ทำแทนไม่ได้ — ต้องเปิด editor ครั้งเดียว
`/exec` จะตอบ **403** จนกว่าเจ้าของจะอนุญาตสิทธิ์ให้สคริปต์ (Google บังคับ ข้ามไม่ได้)
```bash
clasp open-script
```
→ เลือกฟังก์ชัน `setup` → **Run** → กด Review permissions → Advanced → Go to workout (unsafe) → Allow
ครั้งเดียวจบ ได้ทั้งสิทธิ์และชีต 5 ใบพร้อมกัน หลังจากนั้น `?action=ping` จะตอบ JSON

### 📋 ต้องรันเองในตัว editor — 3 อย่าง (หลังย้ายโปรแกรมเข้าชีต)
`clasp push -f` แล้ว deploy เวอร์ชันใหม่ก่อน จากนั้น `clasp open-script` → กด `Cmd+R` → Run ทีละอัน

| ลำดับ | ฟังก์ชัน | ทำอะไร | รันซ้ำได้ไหม |
|---|---|---|---|
| 1 | `setup()` | เติมคอลัมน์ใหม่ `secs` `log` ในหัวตาราง Program | ได้ ไม่แตะข้อมูล |
| 2 | `seedProgram()` | เติมท่า 25 แถวลงชีต Program | ปลอดภัย — ถ้ามีแถวแล้วจะไม่ยอมเขียนทับ |
| 3 | `buildDashboard()` | สร้างชีต `สรุป` + กราฟ 4 อัน | ได้ (ลบชีตเดิมแล้วสร้างใหม่) |

เช็คผลที่ **Execution log** · แล้วทดสอบจากเบราว์เซอร์:
`…/exec?action=getProgram` ต้องได้ 25 แถว · `…/exec?action=progress` ต้องได้ `ไม่รู้จัก action`

> ข้อ 2 รันครั้งเดียวตอนย้ายเข้าชีตพอ — **หลังจากนั้นชีตคือของจริง** แก้ท่าที่ชีตได้เลย
> รันซ้ำจะ throw ไม่เขียนทับให้ · อยากคืนค่าเป็นฉบับในโค้ดจริง ๆ ต้อง Run
> `resetProgramFromCode()` ซึ่งลบท่าที่แก้ในชีตทิ้งหมด — copy ชีตเก็บไว้ก่อนรัน

### 🔓 เรื่องความปลอดภัย — รู้ไว้ก่อน
ไม่มี auth/token/LockService โดยตั้งใจ (ผู้ใช้คนเดียว ไม่มี race) และ **URL `/exec` ฝังอยู่ใน
`api.js` ซึ่งอยู่ใน repo สาธารณะ** เจ้าของเลือกแบบนี้เองเพื่อให้เหมือน TJ Inventory

ข้อต่างที่ต้องรู้: **TJ Inventory มี token ป้องกัน action เขียน แต่โปรเจกต์นี้ไม่มีเลย**
ใครเจอ URL ก็อ่านและเขียนชีตได้ รวมคะแนนปวดตอนเช้า ความเสี่ยงจริงคือมีคนสุ่มเจอแล้วยิงขยะใส่
ซึ่งต่ำแต่ไม่ใช่ศูนย์

ถ้าอยากปิดช่องนี้ทีหลัง — **ลบ `DEFAULT_API_URL` ใน `api.js` ออก** แล้ว URL จะไม่อยู่ในโค้ดอีก
แอปรองรับอยู่แล้ว: แตะป้ายมุมขวาบน → วาง URL → เก็บใน localStorage ของเครื่องนั้น

## git — ทำงาน 2 เครื่อง (Mac + Windows)

**กติกาข้อเดียวที่ห้ามแหก: `.git` ห้ามอยู่ใน OneDrive**

OneDrive ซิงก์โฟลเดอร์ `.git/` ไปด้วย ซึ่งข้างในเป็นฐานข้อมูลไบนารีที่ git เขียนทับตลอดเวลา
ถ้าซิงก์ไฟล์ที่เขียนยังไม่เสร็จไปทับอีกเครื่อง repo พังทันที — เกิดกับ TJ Inventory มาแล้ว
(`ค้างเก่า 5 commit ไม่ตรง origin` + `mmap timeout`) ไม่มี config ของ git ตัวไหนแก้ได้
เพราะปัญหาไม่ได้อยู่ที่ git

> ทางเลี่ยงที่ **ใช้ไม่ได้**: `git init --separate-git-dir` ย้าย `.git` ออกนอก OneDrive ได้จริง
> แต่ทิ้งไฟล์ pointer ที่เขียน absolute path ของเครื่องนั้นไว้ พอข้ามไปอีก OS ก็ผิด

### การจัดวาง
| อะไร | อยู่ที่ไหน | ซิงก์ด้วย |
|---|---|---|
| ไฟล์ทำงาน (source of truth) | โฟลเดอร์ `ออกกำลังกาย` ใน OneDrive | OneDrive |
| git repo | 🍎 `~/repos/tj-workout` · 🪟 `C:\Users\tujas\tj-workout` | GitHub |

repo มี **ทั้งโปรเจกต์** ไม่ใช่แค่ frontend — แอปอยู่ที่ root (GitHub Pages เสิร์ฟจาก root
เท่านั้น เสิร์ฟจาก `frontend/` ไม่ได้) ส่วน `docs/` `gas/` `CONTEXT.md` วางคู่กันไป

### วิธีใช้ — มีสคริปต์ให้แล้ว ไม่ต้องจำคำสั่ง copy
```bash
cd "/Users/tujas/Library/CloudStorage/OneDrive-ส่วนบุคคล/ออกกำลังกาย"
./sync-to-repo.sh                      # copy + ดูว่าอะไรเปลี่ยน
./sync-to-repo.sh "fix: แก้อะไรบางอย่าง"  # copy + commit + push
```
```powershell
cd "C:\Users\tujas\OneDrive\ออกกำลังกาย"
.\sync-to-repo.ps1
.\sync-to-repo.ps1 "fix: แก้อะไรบางอย่าง"
```
สคริปต์ `git pull --ff-only` ให้ก่อนเสมอ — กันกรณีอีกเครื่อง push ไปแล้ว

⚠️ **`sync-to-repo.ps1` ต้องเป็น UTF-8 “มี BOM”** — PowerShell 5.1 อ่านไฟล์ `.ps1` ที่ไม่มี BOM
เป็น ANSI ภาษาไทยจะเพี้ยนเป็น `เธเนเธญเธ` แล้วพัง parser ทั้งไฟล์ (เจอจริง 2026-08-25)
เครื่องมือบางตัวเซฟทับแบบไม่มี BOM ได้ — ถ้าสคริปต์พังขึ้นมาเฉย ๆ ให้เช็คอันนี้ก่อน
```bash
head -c 3 sync-to-repo.ps1 | xxd     # ต้องได้ efbb bf
```

⚠️ **อย่าใส่ `2>&1` ตอนเรียกสคริปต์จาก PowerShell 5.1** — git เขียน warning ปกติ (เช่น
เรื่อง CRLF) ลง stderr แล้ว PS จะแปลงเป็น error หยุดสคริปต์กลางคัน ทั้งที่ไม่มีอะไรผิด

⚠️ **สลับเครื่องเมื่อไหร่ ให้รันสคริปต์ (หรือ `git pull`) ก่อนเริ่มแก้เสมอ**
ไม่งั้น commit จะแตกสายเหมือนที่เคยเจอ

### ครั้งแรกบนเครื่องใหม่
```bash
git clone https://github.com/tujas789/tj-workout.git ~/repos/tj-workout
```
```powershell
git clone https://github.com/tujas789/tj-workout.git C:\Users\tujas\tj-workout
```

## GitHub Pages (frontend)  ✅ ขึ้นแล้ว 2026-08-25
- **เปิดใช้งาน:** https://tujas789.github.io/tj-workout/
- **Repo:** https://github.com/tujas789/tj-workout (สาธารณะ · บัญชี tujas789)
- **clone อยู่ที่:** 🍎 `~/repos/tj-workout`
- **source of truth:** `frontend/` ในโฟลเดอร์นี้ (แก้ที่นี่ → copy ไป repo → push)

```bash
cd ~/repos/tj-workout && git pull --ff-only
cp "/Users/tujas/Library/CloudStorage/OneDrive-ส่วนบุคคล/ออกกำลังกาย/frontend/"{index.html,style.css,instrument-panel.css,program.js,api.js,app.js,manifest.json} ~/repos/tj-workout/
# ปกติใช้ ./sync-to-repo.sh แทน — คำสั่งนี้ไว้ดูว่าสคริปต์ทำอะไรให้
git add -A && git commit -m "<สรุปสั้นๆ>" && git push origin main
```

- ⚠️ **cache-buster:** แก้ css/js แล้วต้อง bump `?v=YYYYMMDD` ใน `index.html` ด้วย
  ไม่งั้นมือถือโหลด js เก่าค้าง cache ปนกับ html ใหม่
- ⚠️ อย่าวาง `.git` ไว้ใน OneDrive (เคยเจอ mmap timeout ในโปรเจกต์ TJ Inventory)

## ดูตอนพัฒนา
```bash
python3 -m http.server 8799 --directory frontend    # รันจาก root ของโปรเจกต์
```
(`.claude/launch.json` ใช้ path แบบเดียวกันแล้ว — เดิมเป็น absolute path ของ Mac ทำให้ฝั่ง Windows รันไม่ได้)
เปิด `http://127.0.0.1:8799` — ถ้ายังไม่ได้วาง `API_URL` แอปจะทำงานโหมด "เครื่องนี้เท่านั้น"
(เก็บ localStorage อย่างเดียว) ใช้ลองได้ครบทุกหน้า
