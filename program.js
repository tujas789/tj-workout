/* program.js — นิยามโปรแกรมฝึก (fallback ในเครื่อง)
   ★ source of truth จริงคือชีต Program — ไฟล์นี้ใช้ตอนออฟไลน์/ยังไม่ได้ตั้งชีต
   ★ แก้โปรแกรม = แก้แถวในชีต ไม่ต้อง deploy ใหม่ (ดู docs/SCHEMA.md)

   ประเภทท่า (type) กำหนดว่านาฬิกาทำงานยังไง:
     hold     — ท่าค้าง นับถอยหลังตามวินาที + เสียงเตือน
     reps     — บันทึกน้ำหนัก/ครั้ง + นาฬิกาจับเวลาพัก
     interval — นาฬิกาสลับเร่ง/ผ่อนอัตโนมัติ
     time     — จับเวลาอย่างเดียว (วอร์ม/คูล)                                */

const PROGRAM = {
  version: '2026-08-25',
  note: 'ปรับจากฉบับแรก 13 จุด หลังคุยกัน 6 รอบ — ดู README.md และ docs/adr/',

  /* ── รอบ ── ไม่ผูกกับวันในปฏิทิน
     เซสชันหลักเรียงเป็นวงหมุน ทำอันไหนเสร็จ อันถัดไปคืออันต่อจากนั้น
     จะทำวันจันทร์หรือวันเสาร์ไม่สำคัญ สำคัญที่ "ลำดับ" กับ "ระยะห่าง"           */
  cycle: ['homeB', 'gym', 'homeA'],

  /* ลำดับความสำคัญเวลาเวลาไม่พอ — ตัดจากท้ายก่อน (Q31) */
  priority: ['gym', 'homeB', 'homeA'],

  /* กติการะยะห่าง — หน่วยเป็นวัน
     ไม่มี beforeTest เพราะแอปรู้ไม่ได้ว่าจะลงสนามวันไหน — ฝั่ง "ก่อน" ทำได้แค่เตือนผ่าน note */
  rules: {
    gym:   { minGap: 2, afterTest: 2,
             note: 'ถ้ารู้ว่าจะลงสนามภายใน 2 วัน ให้เลื่อนวันยิมออกไปก่อน — ขาหนักต้องห่างวันทดสอบ' },
    homeB: { minGap: 2 },
    homeA: { minGap: 2 }
  },

  /* เป้าหมายต่อ 7 วัน (ไว้ดูว่าตามทันไหม ไม่ใช่กฎ) */
  perWeek: { main: 3, easy: 2, test: 1 },

  sessions: {

    /* ══════════ บ้าน B ══════════ */
    homeB: {
      label:'บ้าน B — เครื่องยนต์ + เข่า/ข้อเท้า', mins:39, place:'บ้าน',
      why:'วันที่สร้างความเร็วในการฟื้น — ตัวชี้ขาดของแรงตกในเกมสอง',
      items:[
        { id:'wu-b', name:'วอร์ม — ปั่นเบา', type:'time', secs:240,
          cue:'เพิ่มความหนืดขึ้นเรื่อย ๆ นาทีสุดท้ายควรเริ่มหอบเบา ๆ' },

        { id:'wallsit-b', name:'Wall sit / Spanish squat', type:'hold',
          sets:5, hold:45, rest:30, log:true,
          cue:'เข่างอ 90° หลังแนบกำแพง ปลายเท้าอยู่หน้าเข่า — ปวดได้ไม่เกิน 3/10',
          why:'โหลดเอ็นสะบ้าครั้งที่ 1 ของสัปดาห์ + วอร์มเอ็นก่อนปั่นหนัก' },

        { id:'interval', name:'Interval บนจักรยาน', type:'interval', log:true,
          cue:'สลับแบบ A / แบบ B ทุกสัปดาห์ — ดูรายละเอียดในหน้าจับเวลา',
          why:'เครื่องยนต์แอโรบิก = ความเร็วในการฟื้นระหว่างแรลลี่' },

        { id:'calf-1leg', name:'Calf raise ขาเดียว (ดัมเบล 7.5)', type:'reps',
          sets:2, reps:'12/ข้าง', tempo:'3-1-3', rest:45, log:true,
          cue:'ยืนปลายเท้าบนขอบบันได ปล่อยส้นลงต่ำสุด ขึ้น-ลงอย่างละ 3 วินาที' },

        { id:'elbow-2', name:'ยาข้อศอก โดส 2 (ดัมเบล 2 kg)', type:'reps',
          sets:2, reps:'10/ข้าง', tempo:'ลง 4 วิ', rest:30, log:false,
          cue:'Wrist extension + flexion แบบผ่อนลงช้า อย่างละ 2 เซ็ต',
          why:'เกมคู่ตีไดร์ฟแบนเยอะ ข้อศอกรับหนักกว่าเกมเดี่ยว — เพิ่มโดสที่สอง' },

        { id:'cd-b', name:'ยืดคลาย', type:'time', secs:120,
          cue:'น่อง สะโพกหน้า หลังต้นขา ข้างละ 30 วินาที' }
      ]
    },

    /* ══════════ ยิม ══════════ */
    gym: {
      label:'ยิม — โหลดหนัก', mins:50, place:'ยิม',
      why:'วันเดียวที่เพิ่มน้ำหนักได้ไม่จำกัด — ห้ามตัดทิ้ง ห้ามเอาไปทำท่าที่บ้านทำได้',
      items:[
        { id:'wu-g', name:'วอร์ม', type:'time', secs:480,
          cue:'จักรยาน 5 นาที + squat ตัวเปล่า 10 + hip hinge ตัวเปล่า 10 + wall sit 2×30 วิ',
          why:'วอร์มยาวกว่าปกติเพราะตั้งค่าไว้สำหรับตอนเช้า — เอ็นตอนเช้าแข็งกว่า' },

        { id:'legpress', name:'Leg press', type:'reps',
          sets:4, reps:'6–8', tempo:'3-1-1', rest:120, log:true,
          alt:'ไม่มีเครื่อง → Goblet squat (ดัมเบลหนักสุด) หรือ Hack squat',
          cue:'เท้ากลางแป้น ลงจนต้นขาเกือบชิดอก ห้ามล็อกเข่าสุดตอนบน',
          why:'เริ่มที่ leg press ไม่ใช่ squat เพราะคุมมุมเข่าได้แน่นอนกว่า' },

        { id:'rdl', name:'Romanian deadlift', type:'reps',
          sets:4, reps:'8', tempo:'3-0-1', rest:120, log:true,
          alt:'ไม่มีบาร์ → Dumbbell RDL สองมือ',
          cue:'ดันสะโพกไปหลัง เข่างอนิดเดียว หลังตรงตลอด — หยุดทันทีที่หลังเริ่มโก่ง' },

        { id:'pulldown', name:'Lat pulldown (สลับกับ C2)', type:'reps',
          sets:3, reps:'8–10', tempo:'2-1-2', rest:60, log:true,
          alt:'ไม่มีเครื่อง → Dumbbell row หนัก หรือ Assisted pull-up',
          cue:'ดึงศอกลงหาชายโครง ไม่ใช่ดึงด้วยมือ' },

        { id:'inclinedb', name:'Incline dumbbell press (สลับกับ C1)', type:'reps',
          sets:3, reps:'8–10', tempo:'3-0-1', rest:60, log:true,
          alt:'ไม่มีเบาะ → Push-up ยกเท้าสูง',
          cue:'เอียงเบาะ 30° ศอกทำมุม 45° กับลำตัว ไม่กาง 90° (ถนอมไหล่)' },

        { id:'calf-gym', name:'Calf raise ยืน + นั่ง', type:'reps',
          sets:3, reps:'10 ต่อแบบ', tempo:'3-2-3', rest:45, log:true,
          alt:'ไม่มีเครื่อง → ยืนถือดัมเบล / นั่งวางดัมเบลบนเข่า',
          cue:'ทำทั้งเข่าตรงและเข่างอ — คนละมัดกัน' },

        { id:'carry', name:'Farmer carry', type:'reps',
          sets:2, reps:'40 เมตร', rest:90, log:true,
          cue:'หนักที่สุดที่ยังยืนตรงได้ ไหล่ตั้ง อกเปิด',
          why:'ท่าเดียวได้กริป แกนกลาง หลัง ไหล่ — และช่วยข้อศอกโดยตรง' }
      ]
    },

    /* ══════════ บ้าน A ══════════ */
    homeA: {
      label:'บ้าน A — ส่วนบน + ข้อศอก/ไหล่', mins:31, place:'บ้าน',
      why:'เซสชันที่เบาที่สุด จึงวางไว้ใกล้วันทดสอบได้ (ห่าง 2 วัน)',
      items:[
        { id:'wu-a', name:'วอร์ม', type:'time', secs:300,
          cue:'ปั่นเบา 3 นาที + หมุนไหล่ + ยืด-หดสะบัก 10 ครั้ง' },

        { id:'wallsit-a', name:'Wall sit', type:'hold',
          sets:4, hold:45, rest:30, log:true,
          cue:'เข่างอ 90° — โหลดเอ็นเข่าครั้งที่ 2 ของสัปดาห์',
          why:'เอ็นชอบความถี่มากกว่าความหนัก — เข่าได้โหลด 3 ครั้ง/สัปดาห์' },

        { id:'pushup', name:'Push-up (สลับกับ A2)', type:'reps',
          sets:4, reps:'6–10', tempo:'3-1-1', rest:45, log:true,
          cue:'ยากไป → วางมือบนโซฟา · ง่ายไป → ยกเท้าสูง' },

        { id:'row-1arm', name:'One-arm row ดัมเบล 7.5 (สลับกับ A1)', type:'reps',
          sets:3, reps:'10/ข้าง', tempo:'2-1-2', rest:45, log:true,
          cue:'มือยันเก้าอี้ หลังตรงขนานพื้น ดึงศอกไปหลังสะโพก บีบสะบักค้าง 1 วินาที' },

        { id:'wrist-ext', name:'Wrist extension ผ่อนลง (2 kg)', type:'reps',
          sets:2, reps:'10/ข้าง', tempo:'ลง 4 วิ', rest:20, log:false,
          cue:'ฝ่ามือคว่ำ ยกขึ้นด้วยมืออีกข้างช่วย แล้วผ่อนลงเอง 4 วินาที' },

        { id:'wrist-flex', name:'Wrist flexion ผ่อนลง (2 kg)', type:'reps',
          sets:2, reps:'10/ข้าง', tempo:'ลง 4 วิ', rest:20, log:false,
          cue:'เหมือนท่าบน แต่หงายฝ่ามือขึ้น' },


        { id:'ext-rot', name:'External rotation นอนตะแคง (2 kg)', type:'reps',
          sets:2, reps:'12/ข้าง', tempo:'2-1-2', rest:20, log:false,
          cue:'ศอกแนบเอว หมุนแขนขึ้นเพดาน หัวไหล่ห้ามยกตาม — ห้ามใช้น้ำหนักหนักกว่านี้' },

        { id:'deadbug', name:'Dead bug', type:'reps',
          sets:3, reps:'8/ข้าง', tempo:'ช้า', rest:30, log:false,
          cue:'หลังล่างแนบพื้นตลอด ถ้าหลังโก่งขึ้นแปลว่ายืดไกลเกิน' }
      ]
    },

    /* ══════════ ปั่นเบา ══════════ */
    easy: {
      label:'ปั่นเบา', mins:20, place:'บ้าน',
      why:'เบาจนคุยโทรศัพท์ได้ — ไม่เพิ่มภาระการฟื้นตัว จึงไม่ขัดกับ ADR-0001 แต่สร้างฐานแอโรบิก',
      items:[
        { id:'z2', name:'ปั่นเบาต่อเนื่อง', type:'time', secs:1200, log:true,
          cue:'RPE 3–4 — ถ้าพูดเป็นประโยคยาวไม่ได้ แปลว่าหนักเกินไปแล้ว ให้ผ่อนลง' }
      ]
    },

    /* ══════════ โดสขั้นต่ำ ══════════ */
    min: {
      label:'โดสขั้นต่ำ', mins:12, place:'ที่ไหนก็ได้',
      why:'กล้ามเนื้อทนหยุดหนึ่งสัปดาห์ได้ เอ็นไม่ทน — งานเอ็นห้ามขาด',
      items:[
        { id:'wallsit-min', name:'Wall sit', type:'hold', sets:5, hold:45, rest:30, log:true,
          cue:'ตัวเดียวที่ห้ามข้าม' },
        { id:'calf-min', name:'Calf raise ขาเดียว', type:'reps',
          sets:2, reps:'10/ข้าง', tempo:'3-1-3', rest:30, log:true, cue:'ไม่ต้องถือน้ำหนักก็ได้' },
        { id:'elbow-min', name:'ยาข้อศอก (2 kg)', type:'reps',
          sets:1, reps:'10/ข้าง', tempo:'ลง 4 วิ', rest:20, log:false,
          cue:'Wrist extension + flexion อย่างละ 1 เซ็ต' }
      ]
    }
  },

  /* ── Interval สองแบบ สลับกันทุกสัปดาห์ ── */
  intervals: {
    A: { label:'แบบ A · ขยายเครื่องยนต์', turn:'รอบคู่',
         work:240, rest:180, rounds:3,
         cue:'ปั่นหนักระดับพูดได้ทีละคำ (RPE 8) 4 นาที · ผ่อน 3 นาที · 3 รอบ' },
    B: { label:'แบบ B · จำลองแรลลี่', turn:'รอบคี่',
         work:15, rest:45, rounds:16,
         cue:'ล็อกความหนืดไว้ระดับเดียว เร่งด้วยรอบขาล้วน 15 วินาที · ผ่อน 45 วินาที · 16 รอบ',
         note:'ยืดจาก 10 เป็น 15 วิ เพราะเร่งด้วยขาต้องใช้เวลาสร้างแรงนานกว่าเพิ่มความหนืด' }
  },

  /* ── ADR-0001 — ช่วงไต่ช้า 6 สัปดาห์แรก ──
     กล้ามเนื้อที่เคยฝึกแล้วคืนแรงใน 6–10 สัปดาห์ แต่เอ็นไม่มีกลไกความจำแบบนั้น
     ช่วงนี้จึงจงใจยกเบากว่าที่ทำได้ ~30% แม้จะรู้สึกง่ายจนน่ารำคาญ
     นับจากเซสชันหลักครั้งแรกที่บันทึกไว้ ไม่ใช่จากวันติดตั้งแอป                    */
  rampIn: {
    days: 42,
    cut: 30,
    label: 'ช่วงไต่ช้า (ADR-0001)',
    note: 'ยกเบากว่าที่ทำได้ ~30% ไม่ว่าตารางข้างล่างจะบอกว่าอะไร — ให้เอ็นได้ระยะตั้งต้นก่อนกล้ามเนื้อจะเร่ง'
  },

  /* ── บล็อก 5 สัปดาห์ (Q19) ── */
  block: [
    { w:1, focus:'เรียนฟอร์ม',  load:'เบากว่าที่ทำได้ ~30% · RIR 3', hold:30 },
    { w:2, focus:'เริ่มดัน',     load:'+2.5–5% · RIR 2–3',            hold:35 },
    { w:3, focus:'หนักสุด',      load:'RIR 2',                        hold:40 },
    { w:4, focus:'คงที่',        load:'น้ำหนักเท่าสัปดาห์ 3 ไม่เพิ่ม', hold:45 },
    { w:5, focus:'ถอยเพื่อโต',   load:'ลดน้ำหนัก 40% · เซ็ตครึ่งเดียว', hold:45 }
  ],

  /* ── เกจวัดความพร้อม (เช็กตอนตื่น) ── */
  readiness: [
    { id:'pain',  q:'คะแนนปวดตอนเช้า ≤ 3?' },
    { id:'sleep', q:'นอนคืนที่ผ่านมา ≥ 6 ชั่วโมง?' },
    { id:'fresh', q:'ไม่มีความล้าค้างจากเมื่อวาน?' }
  ],

  /* ── ทดสอบรายเดือน ── */
  tests: [
    { id:'wallsit_max', name:'Wall sit นานสุด',            unit:'วินาที' },
    { id:'calf_max',    name:'Calf raise ขาเดียว สูงสุด',  unit:'ครั้ง'  },
    { id:'pushup_max',  name:'Push-up ต่อเนื่องสูงสุด',    unit:'ครั้ง'  },
    { id:'recovery',    name:'วินาทีจนพูดได้เต็มประโยค (หลัง interval)', unit:'วินาที' }
  ]
};

/* ══════════════════════════════════════════════════════════════════════
   คำนวณเวลาต่อเซสชันจากโดสจริง — เดิม hardcode ไว้แล้วมันเพี้ยนไปจากท่าที่แก้
   ทีหลัง (บ้าน A เขียน 31 แต่ของจริง 40+) ตอนนี้คำนวณตอนโหลด เพี้ยนไม่ได้อีก
   ══════════════════════════════════════════════════════════════════════ */
function secPerRep_(tempo) {
  const d = String(tempo || '').match(/\d+/g);
  if (!d) return 3;
  const sum = d.reduce((a, b) => a + +b, 0);
  return d.length === 1 ? sum + 1 : sum;      // จังหวะเดียว = นับแค่ขาลง บวกขากลับอีก 1
}
function repCount_(reps) {
  const str = String(reps || '');
  if (/เมตร/.test(str)) return null;          // carry — คิดเป็นเวลาแทน
  const nums = str.match(/\d+/g);
  if (!nums) return 10;
  const n = +nums[nums.length - 1];           // ช่วง "6–8" เอาตัวบน
  return /ข้าง/.test(str) ? n * 2 : n;
}
function itemSecs_(it, iv) {
  if (it.type === 'time')     return it.secs;
  if (it.type === 'hold')     return it.sets * it.hold + (it.sets - 1) * (it.rest || 30);
  if (it.type === 'interval') return iv.rounds * iv.work + (iv.rounds - 1) * iv.rest;
  const sets = it.sets || 1, rest = it.rest || 45;
  const n = repCount_(it.reps);
  const work = n === null ? 45 : n * secPerRep_(it.tempo);
  return sets * work + (sets - 1) * rest;
}
function sessionSecs_(s, iv) {
  return s.items.reduce((t, it) => t + itemSecs_(it, iv), 0);
}

/* interval แบบ B ยาวกว่า A เล็กน้อย — ใช้ตัวยาวสุดเป็นตัวตั้งเวลาเซสชัน */
(function computeMins() {
  const len = x => x.rounds * x.work + (x.rounds - 1) * x.rest;
  const iv = len(PROGRAM.intervals.A) >= len(PROGRAM.intervals.B)
           ? PROGRAM.intervals.A : PROGRAM.intervals.B;
  Object.keys(PROGRAM.intervals).forEach(k => {
    const x = PROGRAM.intervals[k];
    x.totalMins = Math.round((x.rounds * x.work + (x.rounds - 1) * x.rest) / 60);
  });
  Object.keys(PROGRAM.sessions).forEach(k => {
    PROGRAM.sessions[k].mins = Math.round(sessionSecs_(PROGRAM.sessions[k], iv) / 60);
  });
})();

if (typeof module !== 'undefined') module.exports = PROGRAM;
