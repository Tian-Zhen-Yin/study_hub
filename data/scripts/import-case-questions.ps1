# 导入案例模拟题到「案例分析」节点(domainId=10)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:Path = "C:\Windows\System32;C:\Windows;" + $env:Path

$caseDir = Join-Path $PSScriptRoot "..\senior-arch-review\past-papers\case-types"
$topicNames = @{
  "01"="架构评估ATAM"; "02"="数据库设计"; "03"="架构风格比较"; "04"="UML建模";
  "05"="微服务重构"; "06"="消息与缓存"; "07"="安全架构"; "08"="嵌入式与构件"; "09"="大数据架构"
}

$imported = 0; $failed = 0
Get-ChildItem "$caseDir\*.md" | Where-Object { $_.Name -ne "README.md" } | ForEach-Object {
  $file = $_.Name
  $topicNo = $file.Substring(0,2)
  $topicName = $topicNames[$topicNo]
  $content = Get-Content $_.FullName -Raw -Encoding UTF8

  # 按 "### 模拟题" 切块
  $blocks = [regex]::Split($content, "(?m)^### 模拟题")
  foreach ($block in $blocks) {
    if ($block -notmatch "^ \d+ ·") { continue }
    # 标题行: " 1 · 电商订单中台架构评估（25 分）"，兼容 "…边界划分，25 分）" 结尾
    $titleLine = ($block -split "`n")[0]
    if ($titleLine -notmatch "·\s*(.+?)[（，]\s*\d+\s*分\s*）") { continue }
    $title = $Matches[1].Trim()

    # 题干：【题干】到【小问】之间
    $stem = ""
    if ($block -match "(?s)【题干】[^\n]*\n(.*?)【小问】") { $stem = $Matches[1].Trim() }
    if (-not $stem) { Write-Output "[跳过] $file $title 无题干"; $failed++; continue }

    # 小问：**问 N**（X 分）：内容
    $subs = @()
    $qMatches = [regex]::Matches($block, "(?m)^\*\*问 (\d+)\*\*（(\d+) 分）[：:]\s*(.+)$")
    foreach ($m in $qMatches) {
      $subs += [ordered]@{ no = [int]$m.Groups[1].Value; q = $m.Groups[3].Value.Trim(); score = [int]$m.Groups[2].Value }
    }
    if (-not $subs) { Write-Output "[跳过] $file $title 无小问"; $failed++; continue }

    # 参考答案：【参考答案】到【评分要点】
    $answer = ""
    if ($block -match "(?s)【参考答案】[^\n]*\n(.*?)【评分要点】") { $answer = $Matches[1].Trim() }
    # 去掉答案块内的分隔线
    $answer = ($answer -replace "(?m)^---\s*$", "").Trim()

    # 评分要点：【评分要点】之后
    $analysis = ""
    if ($block -match "(?s)【评分要点】[^\n]*\n(.*)$") {
      $analysis = $Matches[1]
      $analysis = ($analysis -split "(?m)^### 模拟题")[0]
      $analysis = ($analysis -replace "(?m)^---\s*$", "").Trim()
    }

    $fullStem = "【案例题型·$topicName】$title`n`n$stem`n`n【问题】（合计 25 分）"
    $payload = [ordered]@{
      source = "REVIEW"; subject = "案例分析"; type = "CASE"; domainId = 10
      stem = $fullStem
      optionsJson = ($subs | ConvertTo-Json -Compress -Depth 5)
      answer = $answer; analysis = $analysis
    }
    $json = $payload | ConvertTo-Json -Depth 8
    try {
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
      $r = Invoke-RestMethod -Uri "http://localhost:8080/api/questions" -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 30
      $imported++
      Write-Output "[OK] $title (id=$($r.data.id), 小问=$($subs.Count))"
    } catch {
      $failed++
      Write-Output "[FAIL] $title : $($_.Exception.Message)"
    }
  }
}
Write-Output "===== 案例题导入完成: 成功=$imported 失败=$failed ====="
