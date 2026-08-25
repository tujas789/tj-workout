#!/usr/bin/env bash
# sync-to-repo.sh — copy ไฟล์จาก OneDrive (source of truth) เข้า git repo แล้วโชว์สถานะ
#
#   ทำไมต้องมีขั้นตอนนี้: git กับ OneDrive อยู่ด้วยกันไม่ได้เมื่อใช้ 2 เครื่อง
#   OneDrive จะซิงก์โฟลเดอร์ .git/ ซึ่งเป็นฐานข้อมูลไบนารีที่ git เขียนทับตลอด
#   ซิงก์ทับตอนเขียนไม่เสร็จ = repo พัง (เคยเจอมาแล้วกับ TJ Inventory)
#
#   ใช้:  ./sync-to-repo.sh          → copy + git status
#         ./sync-to-repo.sh "ข้อความ commit"  → copy + commit + push
set -e

SRC="/Users/tujas/Library/CloudStorage/OneDrive-ส่วนบุคคล/ออกกำลังกาย"
REPO="$HOME/repos/tj-workout"

[ -d "$REPO" ] || { echo "❌ ไม่พบ $REPO — clone ก่อน: git clone https://github.com/tujas789/tj-workout.git ~/repos/tj-workout"; exit 1; }

echo "→ ดึงของล่าสุดจาก GitHub ก่อน (เผื่ออีกเครื่อง push ไปแล้ว)"
git -C "$REPO" pull --ff-only

echo "→ copy ไฟล์"
# frontend อยู่ที่ root ของ repo เพราะ GitHub Pages เสิร์ฟจาก root เท่านั้น
cp "$SRC/frontend/"{index.html,style.css,instrument-panel.css,program.js,api.js,app.js,manifest.json} "$REPO/"
mkdir -p "$REPO/docs/adr" "$REPO/gas/working"
cp "$SRC/docs/"*.md "$SRC/docs/"*.html "$SRC/docs/"*.drawio "$REPO/docs/"
cp "$SRC/docs/adr/"*.md        "$REPO/docs/adr/"
cp "$SRC/gas/working/"*.gs     "$REPO/gas/working/"
cp "$SRC/gas/working/appsscript.json" "$SRC/gas/working/.clasp.json" "$REPO/gas/working/"
cp "$SRC/"{README.md,CLAUDE.md,CONTEXT.md,.gitignore,sync-to-repo.sh,sync-to-repo.ps1} "$REPO/"

if [ -n "$1" ]; then
  git -C "$REPO" add -A
  git -C "$REPO" commit -m "$1"
  git -C "$REPO" push origin main
  echo "✅ push แล้ว — GitHub Pages จะขึ้นใน ~1 นาที"
else
  git -C "$REPO" status --short
  echo
  echo "ยังไม่ commit — สั่ง ./sync-to-repo.sh \"ข้อความ commit\" เพื่อ commit + push"
fi
