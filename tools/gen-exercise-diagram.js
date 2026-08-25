#!/usr/bin/env node
/* gen-exercise-diagram.js — สร้าง docs/exercises.drawio จาก frontend/program.js
   ★ ไฟล์ .drawio ที่ได้เป็น "ของที่ถูกสร้าง" อย่าแก้ด้วยมือ — แก้ program.js แล้วรันใหม่
       node tools/gen-exercise-diagram.js
   ★ docs/tj-workout.drawio (สถาปัตยกรรม) เป็นคนละไฟล์ วาดมือ แก้มือได้ */

const path = require('path');
const fs   = require('fs');
const P    = require(path.join(__dirname, '..', 'frontend', 'program.js'));

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                          .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const NL = '&#10;';
const B  = t => '&lt;b&gt;' + esc(t) + '&lt;/b&gt;';   // ตัวหนาในป้าย draw.io

/* สีตามชนิดท่า — ชุดเดียวกับธีมแอป */
const STYLE = {
  time:     'fillColor=#f1efe6;strokeColor=#8c8678;dashed=1;fontColor=#4f4a40',
  hold:     'fillColor=#ffe9c7;strokeColor=#14110d',
  interval: 'fillColor=#1d4ed8;strokeColor=#14110d;fontColor=#ffffff',
  reps:     'fillColor=#fafaf7;strokeColor=#14110d'
};
const KIND = { hold:'ท่าค้าง', reps:'ยก', interval:'อินเทอร์วัล', time:'จับเวลา' };

function dose(it) {
  if (it.type === 'hold')     return it.sets + ' × ' + it.hold + ' วิ · พัก ' + (it.rest || 30) + ' วิ';
  if (it.type === 'time')     return Math.round(it.secs / 60) + ' นาที';
  if (it.type === 'interval') return 'สลับ A/B ให้เอง';
  return (it.sets || 1) + ' × ' + (it.reps || '')
       + (it.tempo ? ' · จังหวะ ' + it.tempo : '')
       + (it.rest  ? ' · พัก ' + it.rest + ' วิ' : '');
}

let uid = 0;
const id = p => p + (++uid);

function box(x, y, w, h, label, style) {
  return `        <mxCell id="${id('n')}" value="${label}" style="rounded=0;whiteSpace=wrap;html=1;strokeWidth=2;fontSize=11;align=left;spacingLeft=10;verticalAlign=top;spacingTop=8;${style}" vertex="1" parent="p1">
          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>
        </mxCell>\n`;
}
function text(x, y, w, label, size, extra) {
  return `        <mxCell id="${id('t')}" value="${label}" style="text;html=1;fontSize=${size};align=left;${extra || ''}" vertex="1" parent="p1">
          <mxGeometry x="${x}" y="${y}" width="${w}" height="${size + 12}" as="geometry"/>
        </mxCell>\n`;
}
function arrow(x, y1, y2) {
  return `        <mxCell id="${id('e')}" style="html=1;strokeColor=#14110d;strokeWidth=2;endArrow=block;endFill=1;" edge="1" parent="p1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="${x}" y="${y1}" as="sourcePoint"/><mxPoint x="${x}" y="${y2}" as="targetPoint"/>
          </mxGeometry>
        </mxCell>\n`;
}
function page(name, body) {
  return `  <diagram id="${name.replace(/[^a-z0-9]/gi,'')}" name="${esc(name)}">
    <mxGraphModel dx="1100" dy="760" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="826" background="#e7e4dc" math="0" shadow="0">
      <root>
        <mxCell id="p0"/>
        <mxCell id="p1" parent="p0"/>
${body}      </root>
    </mxGraphModel>
  </diagram>\n`;
}

/* ── หน้าไล่ท่าของหนึ่งเซสชัน ── */
function sessionPage(key) {
  const s = P.sessions[key];
  const W = 620, H = 62, STEP = 88, X = 90, Y0 = 130;
  let b = '';
  b += text(X, 30, 900, esc(s.label), 22, 'fontStyle=1;fontColor=#14110d');
  b += text(X, 62, 900, esc(s.mins + ' นาที · ' + s.items.length + ' ท่า · ' + s.place), 12, 'fontColor=#4f4a40');
  if (s.why) b += text(X, 84, 900, esc(s.why), 11, 'fontColor=#8c8678');

  s.items.forEach((it, i) => {
    const y = Y0 + i * STEP;
    const label = B((i + 1) + '. ' + it.name) + NL
                + esc('[' + KIND[it.type] + ']  ' + dose(it))
                + (it.log ? esc('   ⟨บันทึกน้ำหนัก/ครั้ง⟩') : '');
    b += box(X, y, W, H, label, STYLE[it.type] || STYLE.reps);
    if (it.cue)
      b += box(X + W + 24, y, 380, H, esc('💡 ' + it.cue),
               'fillColor=#f1efe6;strokeColor=#cfcabd;dashed=1;fontSize=10;fontColor=#4f4a40');
    if (it.alt)
      b += box(X + W + 24, y + H + 2, 380, 22, esc('สำรอง: ' + it.alt),
               'fillColor=#ffe9c7;strokeColor=#8c8678;dashed=1;fontSize=9;fontColor=#4f4a40;verticalAlign=middle;spacingTop=0');
    if (i < s.items.length - 1) b += arrow(X + W / 2, y + H, y + STEP);
  });
  return page(s.label.split(' — ')[0], b);
}

/* ── หน้ารวมทุกเซสชันเทียบกัน ── */
function overviewPage() {
  const cols = ['homeB', 'gym', 'homeA'];
  const W = 320, H = 52, STEP = 62, Y0 = 150;
  let b = text(70, 30, 900, 'ท่าทั้งหมด — เทียบกันสามเซสชันหลัก', 22, 'fontStyle=1;fontColor=#14110d');
  b += text(70, 62, 1000, esc('รวม ' + cols.reduce((a,k)=>a+P.sessions[k].mins,0)
        + ' นาที/รอบ · หมุนซ้าย→ขวา แล้ววนกลับ · สร้างจาก frontend/program.js'), 12, 'fontColor=#4f4a40');

  cols.forEach((key, c) => {
    const s = P.sessions[key], X = 70 + c * 360;
    b += box(X, 105, W, 34, B(s.label.split(' — ')[0]) + '  ' + esc(s.mins + ' นาที'),
             'fillColor=#1d4ed8;strokeColor=#14110d;fontColor=#ffffff;fontSize=13;verticalAlign=middle;spacingTop=0');
    s.items.forEach((it, i) => {
      const y = Y0 + i * STEP;
      b += box(X, y, W, H, B(it.name) + NL + esc(dose(it)),
               STYLE[it.type] || STYLE.reps);
      if (i < s.items.length - 1) b += arrow(X + W / 2, y + H, y + STEP);
    });
  });
  return page('ท่าทั้งหมด', b);
}

/* ── หน้า interval + โดสขั้นต่ำ ── */
function extrasPage() {
  let b = text(70, 30, 900, 'Interval 2 แบบ · ปั่นเบา · โดสขั้นต่ำ', 22, 'fontStyle=1;fontColor=#14110d');
  b += text(70, 62, 1000, 'แบบ A กับ B สลับกันตามจำนวนครั้งที่ทำบ้าน B ไปแล้ว ไม่ได้ดูปฏิทิน', 12, 'fontColor=#4f4a40');

  ['A', 'B'].forEach((k, c) => {
    const x = P.intervals[k], X = 70 + c * 520;
    b += box(X, 110, 470, 34, B(x.label) + '  ' + esc(x.totalMins + ' นาที · ' + x.turn),
             'fillColor=#1d4ed8;strokeColor=#14110d;fontColor=#ffffff;fontSize=13;verticalAlign=middle;spacingTop=0');
    b += box(X, 154, 470, 70, esc(x.rounds + ' รอบ') + NL + esc('เร่ง ' + x.work + ' วิ → ผ่อน ' + x.rest + ' วิ') ,
             'fillColor=#fafaf7;strokeColor=#14110d;fontSize=12');
    b += box(X, 234, 470, 78, esc(x.cue), 'fillColor=#f1efe6;strokeColor=#cfcabd;dashed=1;fontSize=10;fontColor=#4f4a40');
    if (x.note) b += box(X, 320, 470, 50, esc('หมายเหตุ: ' + x.note),
             'fillColor=#ffe9c7;strokeColor=#8c8678;dashed=1;fontSize=10;fontColor=#4f4a40');
  });

  const m = P.sessions.min;
  b += text(70, 410, 900, esc(m.label + ' — ' + m.mins + ' นาที'), 16, 'fontStyle=1;fontColor=#14110d');
  b += text(70, 436, 1000, esc(m.why), 11, 'fontColor=#8c8678');
  m.items.forEach((it, i) => {
    const y = 470 + i * 78;
    b += box(70, y, 620, 58, B((i + 1) + '. ' + it.name) + NL + esc(dose(it)),
             STYLE[it.type] || STYLE.reps);
    if (i < m.items.length - 1) b += arrow(380, y + 58, y + 78);
  });

  const e = P.sessions.easy;
  b += box(740, 470, 400, 100,
      B(e.label + ' — ' + e.mins + ' นาที') + NL + NL + esc(e.items[0].cue),
      'fillColor=#c7e8d0;strokeColor=#14110d;fontSize=12');
  b += box(740, 585, 400, 76, esc(e.why), 'fillColor=#f1efe6;strokeColor=#cfcabd;dashed=1;fontSize=10;fontColor=#4f4a40');
  return page('Interval + โดสขั้นต่ำ', b);
}

const out = '<mxfile host="app.diagrams.net" type="device">\n'
  + overviewPage()
  + ['homeB', 'gym', 'homeA'].map(sessionPage).join('')
  + extrasPage()
  + '</mxfile>\n';

const dest = path.join(__dirname, '..', 'docs', 'exercises.drawio');
fs.writeFileSync(dest, out);
console.log('เขียน ' + path.relative(process.cwd(), dest) + ' แล้ว · '
  + (out.match(/<diagram /g) || []).length + ' หน้า · ' + out.length + ' ไบต์');
