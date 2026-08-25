/* 01_api.gs — Web App API (JSON ล้วน ตามแบบ ADR-0002 ของ TJ Inventory)
   GET  ?action=ping|getProgram
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
