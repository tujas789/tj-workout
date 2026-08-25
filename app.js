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

/* เดิมสูตรนี้เขียนซ้ำ 4 จุด */
const agoText = d => { const n = daysSince(d); return n === 0 ? 'วันนี้' : n === 1 ? 'เมื่อวาน' : n + ' วันก่อน'; };

/* api.js ไม่แตะ DOM — มันเรียก onSyncChange() แล้ว UI มาวาดที่นี่ */
function renderSyncBadge() {
  const el = $('syncBadge'); if (!el) return;
  if (NO_SERVER)         { el.textContent = 'ตั้งค่า API'; el.className = 'ip-badge ip-badge--danger'; }
  else if (QUEUE.length) { el.textContent = 'รอส่ง ' + QUEUE.length; el.className = 'ip-badge ip-badge--accent'; }
  else                   { el.textContent = 'ซิงก์แล้ว'; el.className = 'ip-badge ip-badge--ok'; }
}
onSyncChange = renderSyncBadge;

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
  if (!c.hidden) { $('inApiUrl').value = API_URL || ''; $('apiStatus').textContent = ''; renderSetup(); window.scrollTo(0, 0); }
});
$('btnCloseApi').addEventListener('click', () => { $('setupCard').hidden = true; });
$('btnClearHist').addEventListener('click', () => {
  if (!confirm('ล้างประวัติในเครื่องทั้งหมด ' + HIST.length + ' รายการ?\n\n' +
               'รอบจะเริ่มใหม่จากบ้าน B · แถวในชีตไม่ถูกลบ')) return;
  HIST = []; LS.set('hist', []);
  LS.removePrefix('ready:');
  ready = {};
  renderToday(); renderReady(); renderCycle(); renderSetup();
  toast('ล้างแล้ว — เริ่มรอบใหม่');
});
function renderSetup() {
  $('verInfo').textContent = 'โปรแกรมเวอร์ชัน ' + PROGRAM.version + ' · ' + PROGRAM.note;
  const last = HIST[HIST.length - 1];
  $('histInfo').textContent = HIST.length
    ? HIST.length + ' รายการ · ล่าสุด ' + labelOf(last.key) + ' ' +
      agoText(last.d)
    : 'ยังไม่มีประวัติ — รอบจะเริ่มที่บ้าน B';
}
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

/* ═══════════════ วันนี้ — เสนอเซสชันถัดไปจาก "รอบ" ไม่ใช่จากวันในปฏิทิน ═══════════════ */

/* เหตุผลที่ยังทำเซสชันนี้ไม่ได้ (null = ทำได้) */
function blockReason(key) {
  const r = PROGRAM.rules[key] || {};
  const ls = lastOf(key);
  if (ls) {
    if (daysSince(ls.d) < (r.minGap || 2))
      return 'เพิ่งทำไป' + agoText(ls.d) + ' — ควรเว้น ' + (r.minGap || 2) + ' วัน';
  }
  if (r.afterTest) {
    const lt = lastOf('test');
    if (lt && daysSince(lt.d) < r.afterTest)
      return 'ลงสนาม' + agoText(lt.d) + ' — ขาหนักต้องห่างวันทดสอบ ' + r.afterTest + ' วัน';
  }
  return null;
}

/* เซสชันถัดไปในวง ถ้าติดกติกาก็ข้ามไปตัวถัดไป ถ้าติดหมดก็เสนอปั่นเบา */
function suggest() {
  const cyc = PROGRAM.cycle;
  const mains = HIST.filter(h => cyc.includes(h.key));
  const last  = mains[mains.length - 1];
  const start = last ? (cyc.indexOf(last.key) + 1) % cyc.length : 0;
  const skipped = [];
  for (let i = 0; i < cyc.length; i++) {
    const key = cyc[(start + i) % cyc.length];
    const why = blockReason(key);
    if (!why) return { key, skipped };
    skipped.push({ key, why });
  }
  return { key: 'easy', skipped };
}

let SUGGEST = null;

/* เหลืออีกกี่วันในช่วงไต่ช้า — นับจากเซสชันหลักครั้งแรกที่บันทึกไว้ (ADR-0001)
   null = ยังไม่เริ่ม หรือพ้นช่วงแล้ว */
function rampLeft() {
  const first = HIST.filter(h => PROGRAM.cycle.includes(h.key))[0];
  if (!first) return null;
  const left = PROGRAM.rampIn.days - daysSince(first.d);
  return left > 0 ? left : null;
}

function renderToday() {
  $('hdDate').textContent = todayISO();
  SUGGEST = suggest();
  const key = SUGGEST.key;
  const s = PROGRAM.sessions[key];

  $('todayTitle').textContent = s.label;
  $('todayWhy').textContent   = s.why || '';
  $('todayMeta').textContent  = s.place + ' · ' + s.mins + ' นาที · ' + s.items.length + ' ท่า';
  $('btnStart').textContent   = 'เริ่ม' + (key === 'easy' ? 'ปั่นเบา' : 'เซสชัน');
  $('btnMin').style.display   = key === 'easy' ? 'none' : '';

  /* ทำไมถึงเสนออันนี้ · ทำไมข้ามอันอื่น · เตือนล่วงหน้า — ประกอบครั้งเดียวแล้วเซ็ตทีเดียว */
  const notes = SUGGEST.skipped.map(x =>
    'ข้าม <b>' + esc(labelOf(x.key)) + '</b> — ' + esc(x.why));
  const left = rampLeft();
  if (left !== null)
    notes.unshift('<b>' + esc(PROGRAM.rampIn.label) + '</b> เหลืออีก ' + left + ' วัน — ' + esc(PROGRAM.rampIn.note));
  const rule = PROGRAM.rules[key];
  if (rule && rule.note) notes.push(esc(rule.note));

  const box = $('todayDefer');
  box.hidden = !notes.length;
  box.innerHTML = notes.map(n => '<div>' + n + '</div>').join('');

  /* ทำอะไรไปล่าสุด */
  const lastAny = HIST[HIST.length - 1];
  $('todayLast').textContent = lastAny
    ? 'ล่าสุด: ' + labelOf(lastAny.key) + ' ' + agoText(lastAny.d)
    : 'ยังไม่เคยบันทึกเซสชันไหนเลย — เริ่มที่อันนี้ได้';
}
const labelOf = key => key === 'test' ? 'วันทดสอบ (แบด)'
  : (PROGRAM.sessions[key] ? PROGRAM.sessions[key].label.split(' — ')[0] : key);

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

/* ═══════════════ หลังลงสนามแบด — บันทึกแรงตก ═══════════════ */
let dropoff = null;
function renderTestCard() {
  $('dropScale').innerHTML = Array.from({ length: 11 }, (_, i) =>
    '<button data-v="' + i + '"' + (dropoff === i ? ' class="on"' : '') + '>' + i + '</button>').join('');
  const t = lastOf('test');
  $('testDone').textContent = t && daysSince(t.d) === 0
    ? 'บันทึกวันทดสอบของวันนี้แล้ว — กดซ้ำได้ถ้าจะแก้ตัวเลข' : '';
}
$('dropScale').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  dropoff = +b.dataset.v; renderTestCard();
});
$('btnSaveTestDay').addEventListener('click', () => {
  if (dropoff == null) return toast('เลือกคะแนนแรงตกก่อน');
  const game = $('inLastGame').value;
  Log.test('dropoff', 'แรงตก (เกมสุดท้ายเทียบเกมแรก)', dropoff, '0–10');
  if (game) Log.test('overhead_last_game', 'ตีเหนือหัวเต็มแรงถึงเกมที่', game, 'เกม');
  Log.testDay();
  renderSyncBadge(); renderToday(); renderCycle(); renderTestCard();
  toast('บันทึกแล้ว — วันยิมจะถูกเลื่อนออกไปให้อัตโนมัติ');
});

/* ═══════════════ รอบนี้ ═══════════════ */
function renderCycle() {
  const nextKey = (SUGGEST || suggest()).key;
  const rows = PROGRAM.cycle.concat(['easy']);

  $('cycleList').innerHTML = rows.map(key => {
    const s = PROGRAM.sessions[key];
    const ls = lastOf(key);
    const why = key === 'easy' ? null : blockReason(key);
    const status = ls ? agoText(ls.d) : 'ยังไม่เคย';
    const mark = key === nextKey ? '▶' : why ? '⏸' : '○';
    return '<button class="wk-row' + (key === nextKey ? ' is-next' : '') + '" data-key="' + key + '">' +
      '<span class="wk-dow ' + (why ? 'wait' : 'due') + '">' + mark + '</span>' +
      '<span class="wk-lbl">' + esc(s.label) +
        (why ? '<br><span style="font-size:12px;color:var(--ip-mut)">' + esc(why) + '</span>' : '') + '</span>' +
      '<span class="wk-min">' + status + '</span></button>';
  }).join('');

  $('cycPriority').innerHTML = 'เวลาไม่พอในช่วงนี้? ตัดจากท้ายก่อน — ' +
    PROGRAM.priority.map((k, i) => (i ? ' &gt; ' : '') + '<b>' + esc(labelOf(k)) + '</b>').join('') +
    ' · เหลือน้อยจริง ๆ ใช้โดสขั้นต่ำ ' + PROGRAM.sessions.min.mins + ' นาที';

  const w = PROGRAM.perWeek;
  const mainDone = PROGRAM.cycle.reduce((n, k) => n + doneWithin(k, 7), 0);
  $('cycCount').textContent =
    '7 วันที่ผ่านมา · เซสชันหลัก ' + mainDone + '/' + w.main +
    ' · ปั่นเบา ' + doneWithin('easy', 7) + '/' + w.easy +
    ' · ลงสนาม ' + doneWithin('test', 7) + '/' + w.test;

  $('blockList').innerHTML = PROGRAM.block.map(b =>
    '<div class="blk-row"><span>' + b.w + '</span><span>' + esc(b.focus) + '</span>' +
    '<span>' + esc(b.load) + ' · ค้าง ' + b.hold + ' วิ</span></div>').join('');
}
$('cycleList').addEventListener('click', e => {
  const r = e.target.closest('.wk-row'); if (!r) return;
  const why = blockReason(r.dataset.key);
  if (why && !confirm(labelOf(r.dataset.key) + ' — ' + why + '\n\nเริ่มเลยไหม?')) return;
  startSession(r.dataset.key);
});
$('btnTestDay').addEventListener('click', () => {
  show('today');
  $('testCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
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
/* พฤติกรรมของแต่ละชนิดท่า รวมไว้ที่เดียว — เดิมกระจายเป็น cascade 3 จุด
   (ป้ายชื่อชนิด · ตัวเลขตอนยังไม่เริ่ม · สิ่งที่เกิดเมื่อกดปุ่มหลัก)          */
const TYPE = {
  hold: {
    label: 'ท่าค้าง',
    idle: it => ({ num: it.hold, lbl: 'ค้าง ' + it.hold + ' วินาที' }),
    dots: it => it.sets, showLog: false,
    main: it => 'เริ่ม เซ็ต ' + RUN.setNo,
    go: it => startTick(it.hold, 'work', () => {
      if (it.log) { Log.hold(RUN.key, it.id, it.name, RUN.setNo, it.hold); renderSyncBadge(); }
      if (RUN.setNo < it.sets) startTick(it.rest || 30, 'rest', () => nextSetOrItem(it.sets));
      else { RUN.done++; nextItem(); }
    })
  },
  time: {
    label: 'จับเวลา',
    idle: it => ({ num: mmss(it.secs), lbl: 'พร้อม' }),
    dots: () => 1, showLog: false,
    main: () => 'เริ่ม',
    go: it => startTick(it.secs, 'work', () => {
      if (it.log) Log.set(RUN.key, it.id, it.name, 1, '', Math.round(it.secs / 60) + ' นาที', '');
      RUN.done++; nextItem();
    })
  },
  interval: {
    label: 'อินเทอร์วัล',
    idle: (it, iv) => ({ num: iv.work >= 60 ? mmss(iv.work) : iv.work, lbl: iv.label }),
    dots: (it, iv) => iv.rounds, showLog: false, cue: (it, iv) => iv.cue,
    main: () => 'เริ่ม',
    go: (it, iv) => {
      const round = () => startTick(iv.work, 'work', () => {
        if (RUN.round >= iv.rounds) {
          Log.set(RUN.key, it.id, it.name, 1, '', iv.rounds + ' รอบ', iv.label);
          renderSyncBadge(); RUN.done++;
          toast('จบอินเทอร์วัล — นับวินาทีจนพูดได้เต็มประโยค แล้วบันทึกในหน้าเช้านี้');
          nextItem(); return;
        }
        startTick(iv.rest, 'rest', () => { RUN.round++; RUN.setNo = RUN.round; renderRun(); round(); });
      });
      round();
    }
  },
  reps: {
    label: 'ยก',
    idle: it => ({ num: it.tempo || '—', lbl: (it.sets || 1) + ' × ' + (it.reps || ''), sm: true }),
    dots: it => it.sets || 1, showLog: true,
    main: () => 'บันทึกเซ็ต ' + RUN.setNo,
    go: it => {
      if (it.log) {
        Log.set(RUN.key, it.id, it.name, RUN.setNo, $('inWeight').value, $('inReps').value || it.reps, it.tempo || '');
        $('inReps').value = ''; renderSyncBadge();
      }
      if (RUN.setNo < (it.sets || 1)) startTick(it.rest || 45, 'rest', () => nextSetOrItem(it.sets || 1));
      else { RUN.done++; nextItem(); }
    }
  }
};
const typeOf = it => TYPE[it.type] || TYPE.reps;

const RUN = { on:false, key:null, items:[], i:0, setNo:1, phase:'idle',
              left:0, tick:null, t0:0, done:0, iv:null, round:1 };

function startSession(key) {
  const s = PROGRAM.sessions[key]; if (!s) return;
  Object.assign(RUN, { on:true, key, items:s.items, i:0, setNo:1, phase:'idle',
                       left:0, t0:Date.now(), done:0, round:1 });
  RUN.iv = pickInterval();
  document.body.classList.add('running'); show('run'); renderRun();
}
/* สลับ A/B ตาม "จำนวนครั้งที่ทำบ้าน B ไปแล้ว" ไม่ใช่เลขสัปดาห์ของปฏิทิน
   ถ้าเว้นไป 2 สัปดาห์ จะได้ทำแบบที่ยังไม่ได้ทำ ไม่ใช่ข้ามไปเลย */
function pickInterval() {
  const n = HIST.filter(h => h.key === 'homeB').length;
  return n % 2 === 0 ? PROGRAM.intervals.A : PROGRAM.intervals.B;
}
const curItem = () => RUN.items[RUN.i];

function renderRun() {
  const it = curItem(); if (!it) return finishSession();
  const s = PROGRAM.sessions[RUN.key];

  $('runProg').textContent = 'ท่า ' + (RUN.i + 1) + '/' + RUN.items.length + ' · ' + s.label;
  $('runKind').textContent = typeOf(it).label;
  $('runName').textContent = it.name;
  const T = typeOf(it);
  $('runCue').textContent  = (RUN.phase === 'idle' && T.cue ? T.cue(it, RUN.iv) : it.cue) || '';
  $('runAlt').textContent  = it.alt || '';
  $('runWhy').textContent  = it.why || '';

  /* จุดบอกเซ็ต */
  const total = typeOf(it).dots(it, RUN.iv);
  $('setRow').innerHTML = Array.from({ length: total }, (_, n) =>
    '<div class="setdot' + (n + 1 < RUN.setNo ? ' on' : n + 1 === RUN.setNo ? ' now' : '') + '">' + (n + 1) + '</div>').join('');
  $('setRow').style.display = total > 1 ? '' : 'none';

  /* ช่องบันทึก — เฉพาะท่าที่ log ค่าตัวเลข */
  $('logRow').classList.toggle('hidden', !(typeOf(it).showLog && it.log));

  /* นาฬิกา */
  const box = $('timerBox');
  box.className = 'timer ' + (RUN.phase === 'work' ? 'run' : RUN.phase === 'rest' ? 'rest' : '');
  if (RUN.phase === 'idle') {
    const v = typeOf(it).idle(it, RUN.iv);
    $('timerNum').textContent = v.num;
    $('timerLbl').textContent = v.lbl;
    $('timerNum').classList.toggle('sm', !!v.sm);
  }

  $('btnMain').textContent =
    RUN.phase === 'work' || RUN.phase === 'rest' ? 'หยุด' : typeOf(it).main(it);

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
  typeOf(it).go(it, RUN.iv);
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
  renderSyncBadge(); renderToday(); renderCycle(); show('today');
  toast(quit ? 'ออกแล้ว · ทำไป ' + RUN.done + '/' + RUN.items.length + ' ท่า (' + mins + ' นาที)'
             : 'จบเซสชัน ' + mins + ' นาที — บันทึกแล้ว');
}

$('btnStart').addEventListener('click', () => startSession(SUGGEST.key));
$('btnMin').addEventListener('click', () => startSession('min'));

/* ═══════════════ เริ่มต้น ═══════════════ */
renderToday(); renderReady(); renderTestCard(); renderCycle(); renderMorning(); renderSyncBadge(); syncSoon(800);
