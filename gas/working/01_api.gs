/* 01_api.gs — Web App API (JSON ล้วน ตามแบบ ADR-0002 ของ TJ Inventory)
   GET  ?action=ping|getProgram|progress
   POST {action:'appendBatch', rows:[{id, sheet, row:[...]}]}
   ★ frontend ไม่ตั้ง Content-Type → text/plain → simple request → ไม่มี CORS preflight */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  try {
    if (action === 'ping')       return json_({ ok: true, at: new Date().toISOString() });
    if (action === 'getProgram') return json_({ ok: true, rows: readSheet_('Program') });
    if (action === 'progress')   return json_(progress_());
    return json_({ ok: false, error: 'ไม่รู้จัก action: ' + action });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action !== 'appendBatch') return json_({ ok: false, error: 'ไม่รู้จัก action' });

    const rows = body.rows || [];
    if (!rows.length) return json_({ ok: true, ids: [] });

    // จัดกลุ่มตามชีต แล้ว append ทีเดียวต่อชีต (เร็วกว่า appendRow ทีละแถว)
    const bySheet = {};
    rows.forEach(function (r) { (bySheet[r.sheet] = bySheet[r.sheet] || []).push(r.row); });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Object.keys(bySheet).forEach(function (name) {
      const sh = ss.getSheetByName(name);
      if (!sh) return;
      const vals = bySheet[name];
      const width = Math.max.apply(null, vals.map(function (v) { return v.length; }));
      const norm = vals.map(function (v) {
        const out = v.slice(); while (out.length < width) out.push('');
        return out;
      });
      sh.getRange(sh.getLastRow() + 1, 1, norm.length, width).setValues(norm);
    });
    SpreadsheetApp.flush();

    return json_({ ok: true, ids: rows.map(function (r) { return r.id; }) });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function readSheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getDataRange().getValues();
  const head = vals.shift();
  return vals.map(function (r) {
    const o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o;
  });
}


/* ═══════════════ ?action=progress — สรุปความก้าวหน้าเป็นตัวเลข ═══════════════
   คิดฝั่งเซิร์ฟเวอร์แล้วส่งกลับแค่ตัวเลขไม่กี่ตัว ไม่ส่งแถวดิบ
   เพราะแอปถูกเปิดตอนสัญญาณไม่ดี — ยิ่งเบายิ่งดี

   เทียบ 28 วันล่าสุด กับ 28 วันก่อนหน้านั้น
   ★ กราฟจริงอยู่ในชีต "สรุป" (04_dashboard.gs) — ตรงนี้ไว้ดูเร็ว ๆ ข้างสนามเท่านั้น */

const WIN_ = 28;

function daysAgo_(v) {
  if (!v) return null;
  const d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((t - d) / 86400000);
}

/* คืน [ค่าช่วงล่าสุด, ค่าช่วงก่อนหน้า] จาก reducer ที่ส่งเข้ามา */
function twoWindows_(rows, valueOf) {
  const a = [], b = [];
  rows.forEach(function (r) {
    const ago = daysAgo_(r.date);
    if (ago === null || ago < 0) return;
    const v = valueOf(r);
    if (v === null) return;
    if (ago < WIN_) a.push(v);
    else if (ago < WIN_ * 2) b.push(v);
  });
  return [a, b];
}

const avg_ = a => a.length ? Math.round((a.reduce(function (x, y) { return x + y; }, 0) / a.length) * 10) / 10 : null;
const max_ = a => a.length ? Math.max.apply(null, a) : null;
function num_(x) { const n = Number(x); return (x === '' || x === null || isNaN(n)) ? null : n; }

function progress_() {
  const daily   = readSheet_('Daily');
  const session = readSheet_('Session');
  const setlog  = readSheet_('SetLog');
  const test    = readSheet_('Test');

  /* ปวดตอนเช้า — ต่ำกว่าคือดี */
  const pain = twoWindows_(daily, function (r) { return num_(r.pain); });
  const sleep = twoWindows_(daily, function (r) { return num_(r.sleep_hrs); });

  /* ความสม่ำเสมอ — นับเฉพาะเซสชันที่ทำจริง */
  const sess = twoWindows_(session, function (r) { return r.session_key ? 1 : 0; });

  /* น้ำหนักสูงสุดต่อท่า — เอาเฉพาะท่าที่บันทึกน้ำหนักจริง */
  const byEx = {};
  setlog.forEach(function (r) {
    const w = num_(r.weight); if (w === null || w <= 0) return;
    const ago = daysAgo_(r.date); if (ago === null || ago < 0 || ago >= WIN_ * 2) return;
    const id = String(r.ex_id || '');
    const e = byEx[id] = byEx[id] || { id: id, name: String(r.ex_name || id), now: [], prev: [] };
    (ago < WIN_ ? e.now : e.prev).push(w);
  });
  const lifts = Object.keys(byEx).map(function (k) {
    const e = byEx[k];
    return { id: e.id, name: e.name, now: max_(e.now), prev: max_(e.prev) };
  }).filter(function (e) { return e.now !== null || e.prev !== null; });

  /* ผลทดสอบ — ค่าล่าสุดเทียบกับครั้งก่อนหน้า (ไม่ผูกกับหน้าต่าง 28 วัน) */
  const byTest = {};
  test.forEach(function (r) {
    const v = num_(r.value); if (v === null) return;
    const id = String(r.test_id || ''); if (!id) return;
    (byTest[id] = byTest[id] || []).push({ v: v, ago: daysAgo_(r.date),
                                           name: String(r.test_name || id), unit: String(r.unit || '') });
  });
  const tests = Object.keys(byTest).map(function (k) {
    const a = byTest[k].filter(function (x) { return x.ago !== null; })
                       .sort(function (x, y) { return x.ago - y.ago; });   // ใหม่สุดก่อน
    if (!a.length) return null;
    return { id: k, name: a[0].name, unit: a[0].unit,
             last: a[0].v, ago: a[0].ago, prev: a.length > 1 ? a[1].v : null };
  }).filter(Boolean);

  return {
    ok: true,
    at: new Date().toISOString(),
    win: WIN_,
    pain:  { now: avg_(pain[0]),  prev: avg_(pain[1]),  n: pain[0].length },
    sleep: { now: avg_(sleep[0]), prev: avg_(sleep[1]) },
    sessions: { now: sess[0].length, prev: sess[1].length },
    lifts: lifts,
    tests: tests
  };
}
