$path = "C:\Users\stanr\OneDrive\Desktop\gca-app\src\registry.js"
$lines = Get-Content $path
$totalBefore = $lines.Count
Write-Host "Line count before: $totalBefore"

# Fix 1: Add import after Lesson15WarmupPlayer import
$anchor1 = $lines | Select-String -Pattern '^import Lesson15WarmupPlayer from "\./Lesson15WarmupPlayer";$'
if ($anchor1.Count -ne 1) { Write-Host "ABORT: import anchor not found." -ForegroundColor Red; exit 1 }
$ln1 = $anchor1[0].LineNumber - 1
$lines = $lines[0..($ln1)] + @('import ExtraCredit15Player from "./ExtraCredit15Player";') + $lines[($ln1+1)..($lines.Count-1)]
Write-Host "Fix 1: import added" -ForegroundColor Green

# Fix 2: Add registry entry after lesson15-warmup-v1 closing },
$anchor2 = $lines | Select-String -Pattern '"lesson15-warmup-v1":'
if ($anchor2.Count -ne 1) { Write-Host "ABORT: registry anchor not found." -ForegroundColor Red; exit 1 }
$ln2start = $anchor2[0].LineNumber - 1
$ln2end = $null
for ($i=$ln2start+1; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '^\s*\},\s*$') { $ln2end=$i; break } }
if ($null -eq $ln2end) { Write-Host "ABORT: closing }, not found." -ForegroundColor Red; exit 1 }

$newEntry = @(
    '  "lesson15-ec-v1": {',
    '    id: "lesson15-ec-v1",',
    '    title: "Extra Credit 15 (019)",',
    '    description: "Subtract mixed numbers with different denominators (negative results).",',
    '    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 32,',
    '    Player: ExtraCredit15Player,',
    '  },'
)
$lines = $lines[0..($ln2end)] + $newEntry + $lines[($ln2end+1)..($lines.Count-1)]
Write-Host "Fix 2: registry entry added" -ForegroundColor Green

$content = $lines -join "`r`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $content + "`r`n", $utf8NoBom)
$totalAfter = (Get-Content $path).Count
Write-Host "Line count: $totalBefore -> $totalAfter (added $($totalAfter - $totalBefore) lines)"
Write-Host "Done." -ForegroundColor Cyan
