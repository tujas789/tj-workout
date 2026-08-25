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

   วิธีใช้: Apps Script editor → เลือกฟังก์ชัน seedProgram → Run
   ⚠️ seedProgram() ลบแถวเดิมในชีต Program ทั้งหมดก่อนเขียนใหม่
      ถ้าเคยแก้ท่าในชีตไว้ จะหายหมด — ตั้งใจให้เป็นแบบนั้น (คืนค่าเป็นฉบับในโค้ด) */

const PROGRAM_HEAD = ${JSON.stringify(HEAD)};

const PROGRAM_ROWS = [
${lines}
];

function seedProgram() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Program');
  if (!sh) throw new Error('ยังไม่มีชีต Program — Run setup() ก่อน');

  const before = Math.max(0, sh.getLastRow() - 1);
  if (before) sh.getRange(2, 1, before, sh.getLastColumn()).clearContent();

  sh.getRange(1, 1, 1, PROGRAM_HEAD.length).setValues([PROGRAM_HEAD])
    .setFontWeight('bold').setBackground('#e7e4dc');
  sh.setFrozenRows(1);

  /* reps กับ tempo ต้องเป็นข้อความล้วน ไม่งั้น '6–8' / '3-1-1' กลายเป็นวันที่ */
  sh.getRange(2, 7, sh.getMaxRows() - 1, 2).setNumberFormat('@');

  sh.getRange(2, 1, PROGRAM_ROWS.length, PROGRAM_HEAD.length).setValues(PROGRAM_ROWS);
  SpreadsheetApp.flush();
  return 'ลบ ' + before + ' แถว · เขียนใหม่ ' + PROGRAM_ROWS.length + ' แถว';
}
`;

const dest = path.join(__dirname, '..', 'gas', 'working', '03_program_seed.gs');
fs.writeFileSync(dest, out, 'utf8');
console.log('เขียน ' + path.relative(process.cwd(), dest) + ' แล้ว — ' + rows.length + ' แถว');
