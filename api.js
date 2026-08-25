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
  set(k, v)    { try { localStorage.setItem('tw_' + k, JSON.stringify(v)); } catch (e) {} }
};

let API_URL = '';
let NO_SERVER = !API_URL;
function setApiUrl(u) {
  API_URL = (u || '').trim();
  LS.set('apiUrl', API_URL);
  NO_SERVER = !API_URL;
  renderSyncBadge();
  if (!NO_SERVER) syncSoon(200);
}

/* คิวแถวที่ยังไม่ได้ sync — ทุกการบันทึกลงคิวก่อนเสมอ แล้วค่อยส่ง */
API_URL = LS.get('apiUrl', '') || DEFAULT_API_URL; NO_SERVER = !API_URL;
let QUEUE = LS.get('queue', []);
const queueSave = () => LS.set('queue', QUEUE);

function enqueue(sheet, row) {
  QUEUE.push({ id: 'q' + Date.now() + Math.random().toString(36).slice(2, 6), sheet, row });
  queueSave();
  syncSoon();
  return QUEUE.length;
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
      renderSyncBadge();
      if (QUEUE.length) syncSoon(30000);
    });
}

window.addEventListener('online', () => syncSoon(500));
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncSoon(500); });

function renderSyncBadge() {
  const el = $('syncBadge');
  if (!el) return;
  if (NO_SERVER)      { el.textContent = 'ตั้งค่า API'; el.className = 'ip-badge ip-badge--danger'; }
  else if (QUEUE.length) { el.textContent = 'รอส่ง ' + QUEUE.length; el.className = 'ip-badge ip-badge--accent'; }
  else                { el.textContent = 'ซิงก์แล้ว'; el.className = 'ip-badge ip-badge--ok'; }
}

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
  },
  daily(pain, sleep, where, note) {
    enqueue('Daily', [todayISO(), nowHM(), pain, sleep, where || '', note || '']);
    LS.set('daily:' + todayISO(), { pain, sleep, where, note });
  },
  test(id, name, value, unit) {
    enqueue('Test', [todayISO(), nowHM(), id, name, value, unit || '']);
  },
  recovery(secs) {
    enqueue('Test', [todayISO(), nowHM(), 'recovery', 'วินาทีจนพูดได้เต็มประโยค', secs, 'วินาที']);
  }
};
