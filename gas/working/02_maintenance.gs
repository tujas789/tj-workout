/* 02_maintenance.gs — ล้างข้อมูลในชีต (รันจาก editor: เลือกฟังก์ชัน → Run)
   ★ ลบ "แถวข้อมูล" อย่างเดียว หัวตารางแถวที่ 1 อยู่ครบเสมอ
   ★ ไม่แตะชีต Program — นั่นคือนิยามโปรแกรม ไม่ใช่บันทึกการฝึก
   ★ ล้างที่นี่ = ล้างฝั่งชีต · ประวัติในมือถือล้างแยกที่แอป (แตะป้ายมุมขวาบน)

   ┌─ ฟังก์ชันที่ใช้บ่อย ────────────────────────────────┐
   │  clearLogs()    ล้างบันทึกทั้งหมด (Session/SetLog/Daily/Test)  │
   │  clearSetLog()  ล้างเฉพาะรายเซ็ต                              │
   │  clearDaily()   ล้างเฉพาะคะแนนปวดตอนเช้า                      │
   │  clearTest()    ล้างเฉพาะผลทดสอบ                              │
   │  clearSession() ล้างเฉพาะรายการเซสชัน                         │
   │  resetAll()     ล้างทุกบันทึก + ลงรูปแบบคอลัมน์ใหม่            │
   └───────────────────────────────────────────────────┘                */

const LOG_SHEETS = ['Session', 'SetLog', 'Daily', 'Test'];

/** ล้างแถวข้อมูลของชีตเดียว คืนจำนวนแถวที่ลบ */
function clearSheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) { Logger.log('ไม่พบชีต ' + name); return 0; }
  const n = sh.getLastRow() - 1;                 // ไม่นับหัวตาราง
  if (n > 0) sh.deleteRows(2, n);
  Logger.log(name + ': ลบ ' + Math.max(n, 0) + ' แถว');
  return Math.max(n, 0);
}

function clearLogs() {
  const total = LOG_SHEETS.reduce(function (sum, name) { return sum + clearSheet_(name); }, 0);
  SpreadsheetApp.flush();
  const msg = 'ล้างบันทึกแล้ว รวม ' + total + ' แถว (หัวตารางอยู่ครบ · ไม่แตะชีต Program)';
  Logger.log(msg);
  return msg;
}

function clearSetLog()  { const n = clearSheet_('SetLog');  SpreadsheetApp.flush(); return 'SetLog: ลบ ' + n + ' แถว'; }
function clearDaily()   { const n = clearSheet_('Daily');   SpreadsheetApp.flush(); return 'Daily: ลบ ' + n + ' แถว'; }
function clearTest()    { const n = clearSheet_('Test');    SpreadsheetApp.flush(); return 'Test: ลบ ' + n + ' แถว'; }
function clearSession() { const n = clearSheet_('Session'); SpreadsheetApp.flush(); return 'Session: ลบ ' + n + ' แถว'; }

/** ล้างทุกบันทึก แล้วลงหัวตาราง+รูปแบบคอลัมน์ใหม่ (เรียก setup ต่อ) */
function resetAll() {
  const a = clearLogs();
  const b = setup();
  Logger.log(a + ' | ' + b);
  return a + ' | ' + b;
}

/** ดูว่าตอนนี้แต่ละชีตมีกี่แถว — รันก่อนล้างเพื่อเช็คว่าจะลบอะไรไป */
function countRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const out = LOG_SHEETS.concat(['Program']).map(function (name) {
    const sh = ss.getSheetByName(name);
    return name + '=' + (sh ? Math.max(sh.getLastRow() - 1, 0) : '-');
  }).join(' · ');
  Logger.log(out);
  return out;
}
