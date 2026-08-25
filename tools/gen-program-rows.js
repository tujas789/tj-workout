#!/usr/bin/env node
/* gen-program-rows.js — สร้าง gas/working/03_program_seed.gs จาก frontend/program.js
   ใช้ครั้งเดียวตอน "ย้ายโปรแกรมเข้าชีต" และตอนที่อยากรีเซ็ตชีตกลับเป็นฉบับในโค้ด
       node tools/gen-program-rows.js     →   clasp push   →   Run seedProgram()
   ★ หลังเติมลงชีตแล้ว ชีตคือของจริง — แก้ท่าที่ชีต ไม่ต้องรันตัวนี้อีก
   ★ program.js เหลือหน้าที่เดียว: เป็นตัวสำรองตอนออฟไลน์/ยังไม่ได้ตั้งชีต */

const path = require('path');
const fs   = require('fs');
const P    = require(path.join(__dirname, '..', 'frontend', 'program.js'));

const HEAD = ['session_key','order','ex_id','name','type','sets','reps','tempo',
              'hold','rest','cue','alt','why','secs','log'];

const v = x => (x == null ? '' : x);

const rows = [];
Object.keys(P.sessions).forEach(key => {
  P.sessions[key].items.forEach((it, i) => {
    rows.push([
      key, i + 1, it.id, it.name, it.type,
      v(it.sets), v(it.reps), v(it.tempo), v(it.hold), v(it.rest),
      v(it.cue), v(it.alt), v(it.why), v(it.secs), it.log ? 'Y' : ''
    ]);
  });
});

const lines = rows.map(r => '  ' + JSON.stringify(r)).join(',\n');

const out = `/* 03_program_seed.gs — ⚠️ ไฟล์นี้ถูกสร้างอัตโนมัติ อย่าแก้ด้วยมือ
   สร้างโดย: node tools/gen-program-rows.js   (จาก frontend/program.js)
   หน้าที่เดียว: เติมชีต Program ครั้งแรก แล้วจากนั้นชีตคือของจริง

   วิธีใช้: Apps Script editor → Run setup() ก่อน → แล้ว Run seedProgram()
   · seedProgram()          เติมชีตที่ยังว่าง — ถ้ามีแถวอยู่แล้วจะไม่ยอมเขียนทับ
   · resetProgramFromCode() ลบทั้งใบแล้วเขียนใหม่จากโค้ด (ท่าที่แก้ในชีตหายหมด) */

const PROGRAM_HEAD = ${JSON.stringify(HEAD)};

const PROGRAM_ROWS = [
${lines}
];

/* ★ ใช้ตอนชีตยังว่าง — ถ้ามีแถวอยู่แล้วจะไม่ยอมเขียนทับ
   เพราะหลังเติมครั้งแรก "ชีตคือของจริง" การเขียนทับ = ลบท่าที่เจ้าของแก้เองทิ้ง */
function seedProgram() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Program');
  if (!sh) throw new Error('ยังไม่มีชีต Program — Run setup() ก่อน');
  const before = Math.max(0, sh.getLastRow() - 1);
  if (before) throw new Error(
    'ชีต Program มีอยู่แล้ว ' + before + ' แถว — seedProgram() ไม่เขียนทับให้\\n' +
    'ถ้าตั้งใจจะคืนค่าเป็นฉบับในโค้ดจริง ๆ (ท่าที่แก้ในชีตจะหายหมด) ให้ Run resetProgramFromCode() แทน');
  return writeProgramRows_(sh, 0);
}

/* ★ ทางกลับตอนแก้ชีตจนพัง — ลบแถวเดิมทั้งหมดแล้วเขียนใหม่จากโค้ด
   ต้องเรียกชื่อนี้เท่านั้น จะได้ไม่มีทางกดพลาดจากเมนู Run */
function resetProgramFromCode() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Program');
  if (!sh) throw new Error('ยังไม่มีชีต Program — Run setup() ก่อน');
  const before = Math.max(0, sh.getLastRow() - 1);
  if (before) sh.getRange(2, 1, before, sh.getLastColumn()).clearContent();
  return writeProgramRows_(sh, before);
}

function writeProgramRows_(sh, before) {

  /* หัวตารางกับรูปแบบคอลัมน์เป็นหน้าที่ของ setup() ใน 00_setup.gs — ที่นี่เขียนแต่ข้อมูล
     (เคยตั้ง setNumberFormat ซ้ำที่นี่ด้วย กลายเป็นสองแหล่งความจริง) */
  if (sh.getLastColumn() < PROGRAM_HEAD.length)
    throw new Error('หัวตาราง Program ยังไม่ครบ ' + PROGRAM_HEAD.length + ' คอลัมน์ — Run setup() ก่อน');

  sh.getRange(2, 1, PROGRAM_ROWS.length, PROGRAM_HEAD.length).setValues(PROGRAM_ROWS);
  SpreadsheetApp.flush();
  return 'ลบ ' + before + ' แถว · เขียนใหม่ ' + PROGRAM_ROWS.length + ' แถว';
}
`;

const dest = path.join(__dirname, '..', 'gas', 'working', '03_program_seed.gs');
fs.writeFileSync(dest, out, 'utf8');
console.log('เขียน ' + path.relative(process.cwd(), dest) + ' แล้ว — ' + rows.length + ' แถว');
