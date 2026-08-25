/* 00_setup.gs — สร้างชีตครั้งแรก
   วิธีใช้: เปิด Apps Script editor → เลือกฟังก์ชัน setup → Run (ครั้งเดียวพอ)
   ★ ไม่มี auth/token/LockService — ผู้ใช้คนเดียว ไม่มี race (ต่างจาก TJ Inventory) */

const SHEETS = {
  Program: ['session_key','order','ex_id','name','type','sets','reps','tempo','hold','rest','cue','alt','why'],
  Session: ['date','time','session_key','mins','done'],
  SetLog : ['date','time','session_key','ex_id','ex_name','set_no','weight','reps','note'],
  Daily  : ['date','time','pain','sleep_hrs','where','note'],
  Test   : ['date','time','test_id','test_name','value','unit']
};

/* คอลัมน์ที่ต้องบังคับเป็น "ข้อความล้วน" ไม่งั้น Sheets แปลงให้เอง:
     '3-1-1'  (จังหวะ) -> 3 ม.ค. 2001
     '6/7'    (ทำครบกี่ท่า) -> 6 ก.ค.
     '6-8'    (ช่วงจำนวนครั้ง) -> วันที่
   ★ ปล่อยคอลัมน์ date/time ให้ Sheets แปลงเป็นวันที่/เวลาตามปกติ — ดีกับการทำกราฟ */
const TEXT_COLS = {
  Program: [7, 8],   // reps, tempo
  Session: [5],      // done
  SetLog : [8, 9]    // reps, note
};

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const head = SHEETS[name];
    sh.getRange(1, 1, 1, head.length).setValues([head])
      .setFontWeight('bold').setBackground('#e7e4dc');
    sh.setFrozenRows(1);
    (TEXT_COLS[name] || []).forEach(function (col) {
      sh.getRange(2, col, sh.getMaxRows() - 1, 1).setNumberFormat('@');
    });
  });
  const first = ss.getSheets()[0];
  if (first.getName() === 'Sheet1' && first.getLastRow() === 0) ss.deleteSheet(first);
  return 'สร้างชีตครบ ' + Object.keys(SHEETS).length + ' ใบแล้ว';
}
