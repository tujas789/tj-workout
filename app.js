/* app.js — logic ทุกหน้า + ตัวรันเซสชัน/นาฬิกา
   ★ นาฬิกาคือเหตุผลที่โปรเจกต์นี้เป็นแอปไม่ใช่เอกสาร:
     จับท่าค้าง · คุมจังหวะ · บล็อกความหนาแน่น · จับเวลาพัก (ไม่ใช่ "ยกจนหมดแรง") */

/* ═══════════════ toast + เสียง ═══════════════ */
let toastT = null;
function toast(msg) {
  const el = $('toast'); if (!el) return;
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200);
}

let AC = null;
function beep(times, freq) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    for (let i = 0; i < (times || 1); i++) {
      const t = AC.currentTime + i * 0.22;
      const o = AC.createOscillator(), g = AC.createGain();
      o.frequency.value = freq || 880; o.type = 'square';
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + 0.2);
    }
  } catch (e) {}
}
const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
const mmss = s => pad(Math.floor(s / 60)) + ':' + pad(s % 60);

/* ═══════════════ สลับหน้า ═══════════════ */
function show(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('is-on', v.id === 'v-' + view));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-on', t.dataset.view === view));
  window.scrollTo(0, 0);
}
$('tabs').addEventListener('click', e => {
  const b = e.target.closest('.tab'); if (!b) return;
  if (RUN.on && !confirm('กำลังทำเซสชันอยู่ ออกเลยไหม?')) return;
  RUN.on = false; stopTick(); document.body.classList.remove('running'); show(b.dataset.view);
});

/* ═══════════════ ตั้งค่าการเชื่อมต่อ ═══════════════ */
$('syncBadge').addEventListener('click', () => {
  const c = $('setupCard');
  c.hidden = !c.hidden;
  if (!c.hidden) { $('inApiUrl').value = API_URL || ''; $('apiStatus').textContent = ''; window.scrollTo(0, 0); }
});
$('btnCloseApi').addEventListener('click', () => { $('setupCard').hidden = true; });
$('btnSaveApi').addEventListener('click', () => {
  const u = $('inApiUrl').value.trim();
  if (u && !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(u))
    return toast('URL ต้องขึ้นต้น https://script.google.com/macros/s/ และลงท้าย /exec');
  setApiUrl(u);
  if (!u) { $('apiStatus').textContent = 'ล้างแล้ว — กลับไปโหมดเก็บในเครื่องอย่างเดียว'; return; }
  $('apiStatus').textContent = 'กำลังทดสอบ…';
  apiGet('ping')
    .then(r => { $('apiStatus').textContent = r && r.ok ? '✓ ต่อได้ — ซิงก์อัตโนมัติแล้ว' : '✗ ตอบกลับผิดรูปแบบ'; toast(r && r.ok ? 'ต่อสำเร็จ' : 'ตอบกลับผิดรูปแบบ'); })
    .catch(e => { $('apiStatus').textContent = '✗ ' + e.message + ' — ถ้าได้ 403 แปลว่ายังไม่ได้ Run setup() ในตัว editor'; });
});

/* ═══════════════ วันนี้ ═══════════════ */
const DOW_TH = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
const todayPlan = () => PROGRAM.week.find(w => w.dow === new Date().getDay()) || PROGRAM.week[0];

function renderToday() {
  const d = new Date();
  $('hdDate').textContent = DOW_TH[d.getDay()] + ' ' + todayISO();

  const plan = todayPlan();
  const s = PROGRAM.sessions[plan.key];
  $('todayTitle').textContent = plan.label;
  $('todayWhy').textContent = s ? (s.why || '') :
    (plan.key === 'test'
      ? 'วันวัดผลของทั้งสัปดาห์ — ลงเต็มที่ก็ต่อเมื่อเกจวัดความพร้อมผ่านครบ 3 ข้อ'
      : 'วันพัก — ร่างกายสร้างของใหม่ตอนนี้ ไม่ใช่ตอนฝึก');

  $('todayMeta').textContent = s
    ? (s.place + ' · ' + s.mins + ' นาที · ' + s.items.length + ' ท่า')
    : (plan.key === 'test' ? 'สนามแบด' : '—');

  $('btnStart').style.display = s ? '' : 'none';
  $('btnMin').style.display   = (s && plan.key !== 'easy') ? '' : 'none';
  if (s) $('btnStart').textContent = 'เริ่ม' + (plan.key === 'easy' ? 'ปั่นเบา' : 'เซสชัน');
}

/* ── เกจวัดความพร้อม ── */
let ready = LS.get('ready:' + todayISO(), {});
function renderReady() {
  $('readyList').innerHTML = PROGRAM.readiness.map(r =>
    '<div class="ready-item' + (ready[r.id] ? ' on' : '') + '" data-id="' + r.id + '">' +
      '<div class="ready-box">' + (ready[r.id] ? '✓' : '') + '</div>' +
      '<span>' + esc(r.q) + '</span></div>').join('');

  const n = PROGRAM.readiness.filter(r => ready[r.id]).length;
  const v = $('readyVerdict');
  const txt = ['ผ่าน 0 ข้อ → เล่นแบบเบา หรือพัก',
               'ผ่าน 1 ข้อ → เล่นแบบเบา หรือพัก',
               'ผ่าน 2 ข้อ → เล่นได้ แต่ไม่นับเป็นวันทดสอบ',
               'ผ่าน 3 ข้อ → ลงเต็มที่ บันทึกผลได้'];
  v.textContent = Object.keys(ready).length ? txt[n] : 'ยังไม่ได้เช็ก';
  v.className = 'ready-verdict ip-mono ' + (!Object.keys(ready).length ? '' : n === 3 ? 'ok' : n === 2 ? 'warn' : 'no');
}
$('readyList').addEventListener('click', e => {
  const it = e.target.closest('.ready-item'); if (!it) return;
  ready[it.dataset.id] = !ready[it.dataset.id];
  LS.set('ready:' + todayISO(), ready); renderReady();
});

/* ═══════════════ สัปดาห์ ═══════════════ */
function renderWeek() {
  const today = new Date().getDay();
  $('weekList').innerHTML = PROGRAM.week.map(w =>
    '<button class="wk-row' + (w.dow === today ? ' is-today' : '') + '" data-key="' + w.key + '">' +
      '<span class="wk-dow">' + DOW_TH[w.dow] + '</span>' +
      '<span class="wk-lbl">' + esc(w.label) + '</span>' +
      '<span class="wk-min">' + (w.mins ? w.mins + ' น.' : '—') + '</span></button>').join('');

  $('blockList').innerHTML = PROGRAM.block.map(b =>
    '<div class="blk-row"><span>' + b.w + '</span><span>' + esc(b.focus) + '</span>' +
    '<span>' + esc(b.load) + ' · ค้าง ' + b.hold + ' วิ</span></div>').join('');
}
$('weekList').addEventListener('click', e => {
  const r = e.target.closest('.wk-row'); if (!r) return;
  const s = PROGRAM.sessions[r.dataset.key];
  if (!s) return toast(r.dataset.key === 'test' ? 'วันทดสอบ — บันทึกผลในหน้า “เช้านี้”' : 'วันพัก');
  startSession(r.dataset.key);
});

/* ═══════════════ เช้านี้ ═══════════════ */
let pain = null, painSites = [];
const WHERE = ['เข่า','ข้อศอก','ไหล่','หลังล่าง','ข้อเท้า','ไม่ปวดเลย'];

function renderMorning() {
  $('painScale').innerHTML = Array.from({ length: 11 }, (_, i) =>
    '<button data-v="' + i + '"' + (pain === i ? ' class="on"' : '') + '>' + i + '</button>').join('');
  $('painWhere').innerHTML = WHERE.map(w =>
    '<button class="chip' + (painSites.includes(w) ? ' on' : '') + '" data-w="' + w + '">' + w + '</button>').join('');
  $('testList').innerHTML = PROGRAM.tests.map(t =>
    '<div class="test-row"><label for="t_' + t.id + '">' + esc(t.name) + '</label>' +
      '<input class="ip-input" id="t_' + t.id + '" type="number" inputmode="numeric" placeholder="' + t.unit + '">' +
      '<button class="ip-btn ip-btn--sm" data-test="' + t.id + '">บันทึก</button></div>').join('');

  const saved = LS.get('daily:' + todayISO(), null);
  $('dailyDone').style.display = saved ? '' : 'none';
  if (saved) $('dailyDone').textContent = 'บันทึกแล้ววันนี้: ปวด ' + saved.pain + '/10 · นอน ' + saved.sleep + ' ชม.';
}
$('painScale').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  pain = +b.dataset.v; renderMorning();
});
$('painWhere').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  const w = b.dataset.w, NONE = 'ไม่ปวดเลย';
  if (w === NONE)                    painSites = painSites.includes(NONE) ? [] : [NONE];
  else if (painSites.includes(w))    painSites = painSites.filter(x => x !== w);
  else                               painSites = painSites.filter(x => x !== NONE).concat(w);
  renderMorning();
});
$('btnSaveDaily').addEventListener('click', () => {
  if (pain == null) return toast('เลือกคะแนนปวดก่อน');
  const sleep = parseFloat($('sleepHrs').value) || '';
  Log.daily(pain, sleep, painSites.join(','), '');
  if (pain <= 3) ready.pain = true;
  if (sleep >= 6) ready.sleep = true;
  LS.set('ready:' + todayISO(), ready); renderReady();
  renderMorning(); renderSyncBadge();
  toast('บันทึกแล้ว — เกจวัดความพร้อมอัปเดตให้ด้วย');
});
$('testList').addEventListener('click', e => {
  const b = e.target.closest('[data-test]'); if (!b) return;
  const t = PROGRAM.tests.find(x => x.id === b.dataset.test);
  const val = $('t_' + t.id).value;
  if (!val) return toast('ใส่ตัวเลขก่อน');
  Log.test(t.id, t.name, val, t.unit); $('t_' + t.id).value = '';
  renderSyncBadge(); toast('บันทึก ' + t.name + ' แล้ว');
});

/* ═══════════════ ตัวรันเซสชัน ═══════════════ */
const RUN = { on:false, key:null, items:[], i:0, setNo:1, phase:'idle',
              left:0, tick:null, t0:0, done:0, iv:null, round:1 };

function startSession(key) {
  const s = PROGRAM.sessions[key]; if (!s) return;
  Object.assign(RUN, { on:true, key, items:s.items, i:0, setNo:1, phase:'idle',
                       left:0, t0:Date.now(), done:0, round:1 });
  RUN.iv = pickInterval();
  document.body.classList.add('running'); show('run'); renderRun();
}
/* แบบ A สัปดาห์คู่ · แบบ B สัปดาห์คี่ — สลับอัตโนมัติตามเลขสัปดาห์ของปี */
function pickInterval() {
  const d = new Date(), start = new Date(d.getFullYear(), 0, 1);
  const wk = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
  return wk % 2 === 0 ? PROGRAM.intervals.A : PROGRAM.intervals.B;
}
const curItem = () => RUN.items[RUN.i];

function renderRun() {
  const it = curItem(); if (!it) return finishSession();
  const s = PROGRAM.sessions[RUN.key];

  $('runProg').textContent = 'ท่า ' + (RUN.i + 1) + '/' + RUN.items.length + ' · ' + s.label;
  $('runKind').textContent = { hold:'ท่าค้าง', reps:'ยก', interval:'อินเทอร์วัล', time:'จับเวลา' }[it.type] || 'ท่า';
  $('runName').textContent = it.name;
  $('runCue').textContent  = it.cue || '';
  $('runAlt').textContent  = it.alt || '';
  $('runWhy').textContent  = it.why || '';

  /* จุดบอกเซ็ต */
  const total = it.type === 'interval' ? RUN.iv.rounds : (it.sets || 1);
  $('setRow').innerHTML = Array.from({ length: total }, (_, n) =>
    '<div class="setdot' + (n + 1 < RUN.setNo ? ' on' : n + 1 === RUN.setNo ? ' now' : '') + '">' + (n + 1) + '</div>').join('');
  $('setRow').style.display = total > 1 ? '' : 'none';

  /* ช่องบันทึก — เฉพาะท่าที่ log ค่าตัวเลข */
  $('logRow').classList.toggle('hidden', !(it.type === 'reps' && it.log));

  /* นาฬิกา */
  const box = $('timerBox');
  box.className = 'timer ' + (RUN.phase === 'work' ? 'run' : RUN.phase === 'rest' ? 'rest' : '');
  if (RUN.phase === 'idle') {
    if (it.type === 'hold')          { $('timerNum').textContent = it.hold; $('timerLbl').textContent = 'ค้าง ' + it.hold + ' วินาที'; }
    else if (it.type === 'time')     { $('timerNum').textContent = mmss(it.secs); $('timerLbl').textContent = 'พร้อม'; }
    else if (it.type === 'interval') { $('timerNum').textContent = RUN.iv.work >= 60 ? mmss(RUN.iv.work) : RUN.iv.work;
                                       $('timerLbl').textContent = RUN.iv.label; }
    else                             { $('timerNum').textContent = it.tempo || '—'; $('timerLbl').textContent = (it.sets||1) + ' × ' + (it.reps||''); }
    $('timerNum').classList.toggle('sm', it.type === 'reps');
  }

  $('btnMain').textContent =
    RUN.phase === 'work' || RUN.phase === 'rest' ? 'หยุด'
    : it.type === 'reps' ? 'บันทึกเซ็ต ' + RUN.setNo
    : 'เริ่ม' + (it.type === 'hold' ? ' เซ็ต ' + RUN.setNo : '');

  if (it.type === 'interval' && RUN.phase === 'idle') $('runCue').textContent = RUN.iv.cue;
  $('runClock').textContent = mmss(Math.floor((Date.now() - RUN.t0) / 1000));
}

/* ── นาฬิกา ── */
function stopTick() { clearInterval(RUN.tick); RUN.tick = null; }

function startTick(secs, phase, onEnd) {
  stopTick();
  RUN.phase = phase; RUN.left = secs;
  const box = $('timerBox');
  box.className = 'timer ' + (phase === 'work' ? 'run' : 'rest');
  $('timerNum').classList.remove('sm');
  const paint = () => {
    $('timerNum').textContent = RUN.left >= 60 ? mmss(RUN.left) : RUN.left;
    $('timerLbl').textContent = phase === 'work' ? 'ออกแรง' : 'พัก';
  };
  paint();
  RUN.tick = setInterval(() => {
    RUN.left--;
    $('runClock').textContent = mmss(Math.floor((Date.now() - RUN.t0) / 1000));
    if (RUN.left === 3) beep(1, 660);
    if (RUN.left <= 0) { stopTick(); beep(2, 990); vibrate([120, 60, 120]); onEnd(); return; }
    paint();
  }, 1000);
  $('btnMain').textContent = 'หยุด';
}

function nextSetOrItem(total) {
  if (RUN.setNo < total) { RUN.setNo++; RUN.phase = 'idle'; renderRun(); }
  else { RUN.done++; nextItem(); }
}
function nextItem() {
  stopTick();
  RUN.i++; RUN.setNo = 1; RUN.phase = 'idle'; RUN.round = 1;
  if (RUN.i >= RUN.items.length) return finishSession();
  renderRun();
}

$('btnMain').addEventListener('click', () => {
  const it = curItem(); if (!it) return;
  beep(1, 520);

  if (RUN.phase === 'work' || RUN.phase === 'rest') { stopTick(); RUN.phase = 'idle'; renderRun(); return; }

  if (it.type === 'hold') {
    startTick(it.hold, 'work', () => {
      if (it.log) Log.hold(RUN.key, it.id, it.name, RUN.setNo, it.hold);
      renderSyncBadge();
      if (RUN.setNo < it.sets) startTick(it.rest || 30, 'rest', () => nextSetOrItem(it.sets));
      else { RUN.done++; nextItem(); }
    });

  } else if (it.type === 'time') {
    startTick(it.secs, 'work', () => {
      if (it.log) Log.set(RUN.key, it.id, it.name, 1, '', Math.round(it.secs / 60) + ' นาที', '');
      RUN.done++; nextItem();
    });

  } else if (it.type === 'interval') {
    const iv = RUN.iv;
    const runRound = () => startTick(iv.work, 'work', () => {
      if (RUN.round >= iv.rounds) {
        Log.set(RUN.key, it.id, it.name, 1, '', iv.rounds + ' รอบ', iv.label);
        renderSyncBadge(); RUN.done++;
        toast('จบอินเทอร์วัล — นับวินาทีจนพูดได้เต็มประโยค แล้วบันทึกในหน้าเช้านี้');
        nextItem(); return;
      }
      startTick(iv.rest, 'rest', () => { RUN.round++; RUN.setNo = RUN.round; renderRun(); runRound(); });
    });
    runRound();

  } else { /* reps */
    if (it.log) {
      const w = $('inWeight').value, r = $('inReps').value;
      Log.set(RUN.key, it.id, it.name, RUN.setNo, w, r || it.reps, it.tempo || '');
      $('inReps').value = ''; renderSyncBadge();
    }
    if (RUN.setNo < (it.sets || 1)) startTick(it.rest || 45, 'rest', () => nextSetOrItem(it.sets || 1));
    else { RUN.done++; nextItem(); }
  }
});

$('btnPrev').addEventListener('click', () => {
  stopTick(); RUN.phase = 'idle';
  if (RUN.setNo > 1) RUN.setNo--; else if (RUN.i > 0) { RUN.i--; RUN.setNo = 1; }
  renderRun();
});
$('btnSkip').addEventListener('click', nextItem);
$('btnQuit').addEventListener('click', () => {
  if (!confirm('ออกจากเซสชัน? ที่บันทึกไปแล้วยังอยู่')) return;
  finishSession(true);
});

function finishSession(quit) {
  stopTick(); RUN.on = false; document.body.classList.remove('running');
  const mins = Math.max(1, Math.round((Date.now() - RUN.t0) / 60000));
  Log.session(RUN.key, mins, RUN.done, RUN.items.length);
  renderSyncBadge(); show('today');
  toast(quit ? 'ออกแล้ว · ทำไป ' + RUN.done + '/' + RUN.items.length + ' ท่า (' + mins + ' นาที)'
             : 'จบเซสชัน ' + mins + ' นาที — บันทึกแล้ว');
}

$('btnStart').addEventListener('click', () => startSession(todayPlan().key));
$('btnMin').addEventListener('click', () => startSession('min'));

/* ═══════════════ เริ่มต้น ═══════════════ */
renderToday(); renderReady(); renderWeek(); renderMorning(); renderSyncBadge(); syncSoon(800);
