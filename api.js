/* api.js — API layer + คิวออฟไลน์
   ตามแบบ TJ Inventory ADR-0002: frontend แยกจาก Apps Script, /exec เป็น JSON API ล้วน
   ★ ไม่ตั้ง Content-Type เอง → body เป็น text/plain → simple request → ไม่มี CORS preflight

   ต่างจาก TJ Inventory ตรงที่:
     · ไม่มี auth/token/role   (ผู้ใช้คนเดียว)
     · ไม่มี LockService       (ไม่มี race)
     · มีคิวออฟไลน์            (ยิม/สนามแบดสัญญาณไม่ดี — กดแล้วต้องติดทันที)   */

/* ▼▼▼ URL /exec (Apps Script → Deploy → Web app) — แบบเดียวกับ TJ Inventory ▼▼▼ */
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzcxFZYCXG2RNeqG6MteHEdPhQr5W7HU0JBW7HXGqS8T_9jVhq3065cipCOMV8Zkj6Z/exec';
/* ▲▲▲ เปลี่ยน URL ได้โดยไม่ต้อง push: แตะป้ายมุมขวาบน → วาง URL ใหม่ (เก็บทับใน localStorage) ▲▲▲
   ⚠️ API นี้ไม่มี auth (ผู้ใช้คนเดียว) และ repo เป็นสาธารณะ — ใครเจอ URL ก็อ่าน/เขียนชีตได้
      เจ้าของรับทราบและเลือกแบบนี้เอง เพื่อให้เหมือน TJ Inventory                          */

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const pad = n => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); };
const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };

/* ═══════════════ เก็บในเครื่อง (แหล่งความจริงระหว่างวัน) ═══════════════ */
const LS = {
  get(k, dflt) { try { return JSON.parse(localStorage.getItem('tw_' + k)) ?? dflt; }
                 catch (e) { return dflt; } },
  set(k, v)    { try { localStorage.setItem('tw_' + k, JSON.stringify(v)); } catch (e) {} },
  removePrefix(p) {
    Object.keys(localStorage)
      .filter(k => k.indexOf('tw_' + p) === 0)
      .forEach(k => localStorage.removeItem(k));
  }
};

let API_URL, NO_SERVER;                              // ค่าจริงตั้งตอนอ่าน localStorage ด้านล่าง
let onSyncChange = () => {};                         // app.js เป็นคนตั้งว่าจะวาดอะไร — api.js ไม่แตะ DOM
function setApiUrl(u) {
  API_URL = (u || '').trim();
  LS.set('apiUrl', API_URL);
  NO_SERVER = !API_URL;
  onSyncChange();
  if (!NO_SERVER) syncSoon(200);
}

/* คิวแถวที่ยังไม่ได้ sync — ทุกการบันทึกลงคิวก่อนเสมอ แล้วค่อยส่ง */
API_URL = LS.get('apiUrl', '') || DEFAULT_API_URL; NO_SERVER = !API_URL;
let QUEUE = LS.get('queue', []);
const queueSave = () => LS.set('queue', QUEUE);

function enqueue(sheet, row) {
  QUEUE.push({ id: 'q' + Date.now() + Math.random().toString(36).slice(2, 6), sheet, row });
  queueSave();
  onSyncChange();      // ให้ป้ายบอก "รอส่ง n" ทันที ไม่ต้องรอ sync จบ
  syncSoon();
}

/* ═══════════════ คุยกับ Apps Script ═══════════════ */
const httpOk = r => {
  if (!r.ok) throw new Error('เซิร์ฟเวอร์ขัดข้อง (HTTP ' + r.status + ')');
  return r.json();
};

function apiGet(action, params) {
  if (NO_SERVER) return Promise.reject(new Error('ยังไม่ได้ตั้ง API_URL'));
  const q = new URLSearchParams(Object.assign({ action }, params || {}));
  return fetch(API_URL + '?' + q).then(httpOk);
}

function apiPost(payload) {
  if (NO_SERVER) return Promise.reject(new Error('ยังไม่ได้ตั้ง API_URL'));
  return fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) }).then(httpOk);
}

/* ═══════════════ sync คิวขึ้นชีต ═══════════════ */
let syncing = false, syncTimer = null;

function syncSoon(ms) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, ms == null ? 1500 : ms);
}

function syncNow() {
  if (syncing || NO_SERVER || !QUEUE.length || !navigator.onLine) return Promise.resolve();
  syncing = true;
  const batch = QUEUE.slice(0, 50);
  return apiPost({ action: 'appendBatch', rows: batch })
    .then(res => {
      if (res && res.ok) {
        const done = new Set((res.ids || batch.map(b => b.id)));
        QUEUE = QUEUE.filter(q => !done.has(q.id));
        queueSave();
      }
    })
    .catch(() => { /* ออฟไลน์/ยิงไม่ผ่าน — คิวยังอยู่ ลองใหม่รอบหน้า */ })
    .finally(() => {
      syncing = false;
      onSyncChange();
      if (QUEUE.length) syncSoon(30000);
    });
}

window.addEventListener('online', () => syncSoon(500));
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncSoon(500); });


/* ═══════════════ โปรแกรมจากชีต (getProgram) ═══════════════
   ลำดับความจริง: ชีต > แคชในเครื่อง > program.js
   ★ ไม่บล็อกการเปิดแอป — แอปเปิดด้วยของที่มีอยู่ทันที แล้วค่อยอัปเดตเมื่อโหลดเสร็จ
     (หลักการข้อ 1: ยิม/สนามแบดสัญญาณไม่ดี ห้ามให้เน็ตเป็นเงื่อนไขของการฝึก)      */
let onProgramChange = () => {};   // app.js ตั้งเอง — api.js ไม่แตะ DOM

/* สถานะโปรแกรม — การ์ดตั้งค่าเอาไปแสดงตรง ๆ ห้ามเดาเอาเอง (เคยบอกสาเหตุผิดมาแล้ว)
   ที่มา: 'ชีต' · 'ชีต (แคชไว้)' · 'ไฟล์ในแอป'
   sheet/code = เซสชันไหนมาจากไหน · skipped = แถวที่ชีตมีแต่ใช้ไม่ได้            */
const PROG_STATE = { src: 'ไฟล์ในแอป', at: '', sheet: [], code: [], skipped: [], tried: false };

function markProgram_(src, at, res) {
  PROG_STATE.src = src;
  PROG_STATE.at  = at || '';
  PROG_STATE.sheet   = res.sheet;
  PROG_STATE.code    = res.code;
  PROG_STATE.skipped = res.skipped;
}

/* เรียกตอนบูต ก่อนวาดหน้าแรก — ใช้ของที่โหลดไว้รอบก่อน */
function applyCachedProgram() {
  const c = LS.get('program', null);
  if (!c) return false;
  const res = applyProgramRows(c.rows);
  if (!res.sheet.length) return false;
  markProgram_('ชีต (แคชไว้)', c.at, res);
  return true;
}

/* เรียกหลังวาดหน้าแรก — ได้ของใหม่ค่อยวาดทับ */
function loadProgram() {
  if (NO_SERVER) return Promise.resolve(false);
  return apiGet('getProgram')
    .then(res => {
      PROG_STATE.tried = true;
      if (!res || !res.ok) return false;
      const applied = applyProgramRows(res.rows);
      if (!applied.sheet.length) {                     // ชีตว่าง/เสียหมด → คงของเดิม แต่บอกให้รู้
        PROG_STATE.sheet   = applied.sheet;            // ต้องอัปเดตด้วย ไม่งั้นค้างค่าจากรอบก่อน
        PROG_STATE.code    = applied.code;
        PROG_STATE.skipped = applied.skipped;
        onProgramChange(false);
        return false;
      }
      const at = todayISO() + ' ' + nowHM();
      const before = LS.get('program', null);
      const changed = !before || JSON.stringify(before.rows) !== JSON.stringify(res.rows);
      LS.set('program', { at, rows: res.rows });
      markProgram_('ชีต', at, applied);
      onProgramChange(changed);                        // changed=false → ของเดิมอยู่แล้ว ไม่ต้องกวน
      return true;
    })
    .catch(() => false);                               // ออฟไลน์ — ของเดิมใช้ได้อยู่แล้ว
}

/* ═══════════════ ความก้าวหน้า (progress) ═══════════════
   ตัวเลขสรุปคิดมาจากชีตแล้ว — แอปแค่วาด
   แคชคำตอบล่าสุดไว้ เปิดตอนไม่มีเน็ตก็ยังเห็นของเมื่อวาน (บอกวันที่กำกับ)   */
function cachedProgress() { return LS.get('progress', null); }

function loadProgress() {
  if (NO_SERVER) return Promise.reject(new Error('ยังไม่ได้ตั้ง API_URL'));
  return apiGet('progress').then(res => {
    if (!res || !res.ok) throw new Error(res && res.error ? res.error : 'ตอบกลับผิดรูปแบบ');
    res.localAt = todayISO() + ' ' + nowHM();
    LS.set('progress', res);
    return res;
  });
}

/* ═══════════════ ประวัติในเครื่อง — ใช้คำนวณว่าวันนี้ควรทำอะไร ═══════════════ */
let HIST = LS.get('hist', []);                      // [{d:'2026-08-25', key:'gym'}]
function histAdd(key) {
  HIST.push({ d: todayISO(), key });
  HIST = HIST.slice(-120);                          // เก็บพอสำหรับ ~4 เดือน
  LS.set('hist', HIST);
}
const daysSince = d => Math.floor((Date.parse(todayISO()) - Date.parse(d)) / 86400000);
const lastOf = key => { for (let i = HIST.length - 1; i >= 0; i--) if (HIST[i].key === key) return HIST[i]; return null; };
const doneWithin = (key, days) => HIST.filter(h => h.key === key && daysSince(h.d) < days).length;

/* ═══════════════ บันทึกแต่ละชนิด ═══════════════ */
const Log = {
  set(sessionKey, exId, exName, setNo, weight, reps, note) {
    enqueue('SetLog', [todayISO(), nowHM(), sessionKey, exId, exName,
                       setNo, weight ?? '', reps ?? '', note || '']);
  },
  hold(sessionKey, exId, exName, setNo, secs) {
    enqueue('SetLog', [todayISO(), nowHM(), sessionKey, exId, exName,
                       setNo, '', secs + ' วิ', 'hold']);
  },
  session(sessionKey, mins, done, total) {
    enqueue('Session', [todayISO(), nowHM(), sessionKey, mins, done + '/' + total]);
    histAdd(sessionKey);
  },
  testDay() {
    enqueue('Session', [todayISO(), nowHM(), 'test', '', 'ลงสนาม']);
    histAdd('test');
  },
  daily(pain, sleep, where, note) {
    enqueue('Daily', [todayISO(), nowHM(), pain, sleep, where || '', note || '']);
    LS.set('daily:' + todayISO(), { pain, sleep, where, note });
  },
  test(id, name, value, unit) {
    enqueue('Test', [todayISO(), nowHM(), id, name, value, unit || '']);
  }
};
