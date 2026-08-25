# sync-to-repo.ps1 — ฝั่ง Windows ของ sync-to-repo.sh
#
#   ทำไมต้องมีขั้นตอนนี้: git กับ OneDrive อยู่ด้วยกันไม่ได้เมื่อใช้ 2 เครื่อง
#   OneDrive จะซิงก์โฟลเดอร์ .git/ ซึ่งเป็นฐานข้อมูลไบนารีที่ git เขียนทับตลอด
#   ซิงก์ทับตอนเขียนไม่เสร็จ = repo พัง (เคยเจอมาแล้วกับ TJ Inventory)
#
#   ใช้:  .\sync-to-repo.ps1                    → copy + git status
#         .\sync-to-repo.ps1 "ข้อความ commit"   → copy + commit + push
param([string]$Message)
$ErrorActionPreference = "Stop"

$SRC  = "C:\Users\tujas\OneDrive\ออกกำลังกาย"        # ⚠️ เช็คให้ตรงกับเครื่องจริง
$REPO = "C:\Users\tujas\tj-workout"

if (-not (Test-Path $REPO)) {
  Write-Host "❌ ไม่พบ $REPO — clone ก่อน:" -ForegroundColor Red
  Write-Host "   git clone https://github.com/tujas789/tj-workout.git $REPO"
  exit 1
}

Write-Host "→ ดึงของล่าสุดจาก GitHub ก่อน (เผื่ออีกเครื่อง push ไปแล้ว)"
git -C $REPO pull --ff-only

Write-Host "→ copy ไฟล์"
# frontend อยู่ที่ root ของ repo เพราะ GitHub Pages เสิร์ฟจาก root เท่านั้น
"index.html","style.css","instrument-panel.css","program.js","api.js","app.js","manifest.json" |
  ForEach-Object { Copy-Item "$SRC\frontend\$_" $REPO -Force }

New-Item -ItemType Directory -Force -Path "$REPO\docs\adr","$REPO\gas\working" | Out-Null
Copy-Item "$SRC\docs\*.md"                    "$REPO\docs\"        -Force
Copy-Item "$SRC\docs\adr\*.md"                "$REPO\docs\adr\"    -Force
Copy-Item "$SRC\gas\working\*.gs"             "$REPO\gas\working\" -Force
Copy-Item "$SRC\gas\working\appsscript.json"  "$REPO\gas\working\" -Force
Copy-Item "$SRC\gas\working\.clasp.json"      "$REPO\gas\working\" -Force
"README.md","CLAUDE.md","CONTEXT.md",".gitignore","sync-to-repo.sh","sync-to-repo.ps1" |
  ForEach-Object { Copy-Item "$SRC\$_" $REPO -Force }

if ($Message) {
  git -C $REPO add -A
  git -C $REPO commit -m $Message
  git -C $REPO push origin main
  Write-Host "✅ push แล้ว — GitHub Pages จะขึ้นใน ~1 นาที" -ForegroundColor Green
} else {
  git -C $REPO status --short
  Write-Host ""
  Write-Host "ยังไม่ commit — สั่ง .\sync-to-repo.ps1 ""ข้อความ commit"" เพื่อ commit + push"
}
