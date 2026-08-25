# tj-workout — frontend

ตารางฝึกแบบบันทึกได้ (แบดมินตัน + ความแข็งแรงของกล้ามเนื้อและเอ็น)
เปิดในมือถือ → เห็นว่าวันนี้ทำอะไร → ทำทีละท่า → จับเวลา → บันทึกลง Google Sheet

**เปิดใช้งาน:** https://tujas789.github.io/tj-workout/

- **Stack:** HTML/JS ล้วน + Google Apps Script (`/exec` เป็น JSON API) + Google Sheet (DB)
- **ธีม:** Instrument Panel (นีโอบรูทัลลิสต์) — accent น้ำเงิน
- **ออฟไลน์:** เขียนลง localStorage ก่อนเสมอ แล้ว sync ขึ้นชีตเมื่อมีเน็ต (ยิม/สนามแบดสัญญาณไม่ดี)

> repo นี้เป็น **frontend อย่างเดียว** — source of truth, เอกสาร, และโค้ด Apps Script
> อยู่ในโฟลเดอร์ `ออกกำลังกาย` บน OneDrive

## ไฟล์
`index.html` โครง · `instrument-panel.css` ธีม · `style.css` ชั้นบน ·
`program.js` นิยามโปรแกรม · `api.js` API + คิวออฟไลน์ · `app.js` logic + นาฬิกา

**ลำดับ script สำคัญ:** program → api → app และต้องอยู่ท้าย body
**แก้ css/js แล้วต้อง bump `?v=YYYYMMDD` ใน `index.html`** ไม่งั้นมือถือโหลดของเก่าค้าง cache
