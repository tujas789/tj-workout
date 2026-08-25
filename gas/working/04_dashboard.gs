/* 04_dashboard.gs — สร้างชีต "สรุป" พร้อมกราฟ 4 อัน
   วิธีใช้: Apps Script editor → เลือกฟังก์ชัน buildDashboard → Run

   ★ ใช้สูตร ไม่ใช่ค่าคงที่ — บันทึกเพิ่มจากแอปเมื่อไหร่ กราฟขยับเอง ไม่ต้องรันซ้ำ
   ★ รันซ้ำได้ตลอด (ลบชีตเดิมแล้วสร้างใหม่) — ชีตนี้ไม่เก็บข้อมูลของตัวเอง ดึงจากใบอื่นล้วน
   ★ เลย์เอาต์: กราฟ 2×2 อยู่มุมซ้ายบน (สิ่งที่อยากเห็น) · ตารางดิบซ่อนไปคอลัมน์ T เป็นต้นไป
   ★ ทำไมไม่เขียนหน้ากราฟในแอป: Google ทำให้ฟรีแล้ว ซูมได้ ดูย้อนหลังได้ไม่จำกัด
      (ในแอปมีแค่ "แท็บก้าวหน้า" ที่เป็นตัวเลข ไว้ดูเร็ว ๆ ข้างสนาม)                */

const DASH = 'สรุป';

/* สัปดาห์เริ่มวันจันทร์ — WEEKDAY(...,3) คืน 0 ที่วันจันทร์พอดี
   ⚠️ ผลลัพธ์เป็น "ตัวเลข" ไม่ใช่ "วันที่" เพราะเกิดจากการลบ
      format ใน QUERY จึงไม่มีผล — ต้อง setNumberFormat ที่คอลัมน์ผลลัพธ์แทน (ดู dateCol_) */
function weekCol_(range) {
  return 'ARRAYFORMULA(IF(' + range + '="",,' + range + '-WEEKDAY(' + range + ',3)))';
}

/* ตารางดิบเริ่มที่คอลัมน์ T แล้วเว้นทีละ 12 คอลัมน์ — พ้นสายตา ไม่ชนกราฟ */
const RAW_COL = 20;
const RAW_GAP = 12;
const colOf_ = i => RAW_COL + i * RAW_GAP;

function buildDashboard() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const old = ss.getSheetByName(DASH);
  if (old) ss.deleteSheet(old);
  const sh = ss.insertSheet(DASH);
  sh.setHiddenGridlines(true);

  /* ── 1. ปวดตอนเช้า เฉลี่ยรายสัปดาห์ — ตัวชี้เอ็นที่สำคัญที่สุด ──
     เส้นนี้ชี้ขึ้น = ช่องว่างกล้ามเนื้อ–เอ็นกำลังเปิด ให้ลดโหลด 20% */
  const c0 = block_(sh, 0, '1 · ปวดตอนเช้า (เฉลี่ยรายสัปดาห์)',
    '=IFERROR(QUERY({' + weekCol_('Daily!A2:A') + ', Daily!C2:C},' +
    '"select Col1, avg(Col2) where Col1 is not null group by Col1' +
    ' label Col1 \'สัปดาห์\', avg(Col2) \'ปวดเฉลี่ย\'"),"ยังไม่มีข้อมูล")', 2);

  /* ── 2. น้ำหนักสูงสุดรายสัปดาห์ แยกตามท่า ── */
  const c1 = block_(sh, 1, '2 · น้ำหนักสูงสุดรายสัปดาห์ (กก.)',
    '=IFERROR(QUERY({' + weekCol_('SetLog!A2:A') + ', SetLog!D2:D, SetLog!G2:G},' +
    '"select Col1, max(Col3) where Col1 is not null and Col3 > 0 group by Col1 pivot Col2' +
    ' label Col1 \'สัปดาห์\'"),"ยังไม่มีข้อมูล")', 10);

  /* ── 3. ผลทดสอบรายเดือน ── */
  const c2 = block_(sh, 2, '3 · ผลทดสอบ',
    '=IFERROR(QUERY({Test!A2:A, Test!D2:D, Test!E2:E},' +
    '"select Col1, max(Col3) where Col1 is not null group by Col1 pivot Col2' +
    ' label Col1 \'วันที่\'"),"ยังไม่มีข้อมูล")', 8);

  /* ── 4. ความสม่ำเสมอ — กี่เซสชันต่อสัปดาห์ ── */
  const c3 = block_(sh, 3, '4 · จำนวนเซสชันต่อสัปดาห์',
    '=IFERROR(QUERY({' + weekCol_('Session!A2:A') + ', Session!C2:C},' +
    '"select Col1, count(Col2) where Col1 is not null group by Col1' +
    ' label Col1 \'สัปดาห์\', count(Col2) \'เซสชัน\'"),"ยังไม่มีข้อมูล")', 2);

  SpreadsheetApp.flush();

  /* กราฟ 2×2 มุมซ้ายบน — เปิดชีตมาเห็นอันนี้ก่อน */
  chart_(sh, 'LINE',   c0, 1,  1, 'ปวดตอนเช้า — ควรลงหรือนิ่ง ถ้าขึ้นให้ลดโหลด 20%');
  chart_(sh, 'LINE',   c1, 1,  7, 'น้ำหนักที่ยกได้ (กก.)');
  chart_(sh, 'LINE',   c2, 17, 1, 'ผลทดสอบรายเดือน');
  chart_(sh, 'COLUMN', c3, 17, 7, 'เซสชันต่อสัปดาห์');

  ss.setActiveSheet(sh);
  sh.setActiveSelection('A1');
  return 'สร้างชีต "' + DASH + '" ใหม่แล้ว — กราฟ 4 อันมุมซ้ายบน · ตารางดิบคอลัมน์ T เป็นต้นไป';
}

/* วางหัวข้อ + สูตร แล้วคืนช่วงข้อมูลไว้ผูกกราฟ
   width = จำนวนคอลัมน์ที่เผื่อไว้ให้ผลลัพธ์ (pivot ทำให้กว้างไม่แน่นอน จึงเผื่อไว้เกินจริง) */
function block_(sh, i, title, formula, width) {
  const col = colOf_(i);
  sh.getRange(1, col).setValue(title).setFontWeight('bold').setBackground('#e7e4dc');
  sh.getRange(2, col).setFormula(formula);
  /* คอลัมน์แรกของทุกบล็อกคือวันที่ (ที่เป็นตัวเลขอยู่) — บังคับให้แสดงเป็นวันที่ */
  sh.getRange(3, col, 298, 1).setNumberFormat('yyyy-mm-dd');
  sh.setColumnWidth(col, 100);
  return sh.getRange(2, col, 300, width);
}

function chart_(sh, type, range, row, col, title) {
  sh.insertChart(sh.newChart()
    .setChartType(Charts.ChartType[type])
    .addRange(range)
    .setNumHeaders(1)
    .setPosition(row, col, 0, 0)
    .setOption('title', title)
    .setOption('width', 480)
    .setOption('height', 300)
    .setOption('legend', { position: 'bottom' })
    .setOption('backgroundColor', '#fafaf7')
    .setOption('hAxis', { format: 'yyyy-MM-dd' })
    /* ⚠️ ต้องบังคับแกน Y เป็นตัวเลข ไม่งั้น Sheets หยิบรูปแบบวันที่ของคอลัมน์สัปดาห์
       มาใช้กับแกนค่าด้วย — 7.5 กก. จะโชว์เป็น '1900-01-07' (เจอจริงตอนรันครั้งที่ 2) */
    .setOption('vAxis', { format: '#,##0.##' })
    .build());
}
