# 导入论文历年真题(2009-2024)到「论文写作」节点(domainId=11)，关联 paper-topics 万能提纲
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:Path = "C:\Windows\System32;C:\Windows;" + $env:Path

$base = "E:\AiProject\study_hub\data\senior-arch-review\past-papers"
$essayFile = "$base\essay-questions-by-year.md"
$topicsDir = "$base\paper-topics"

$topicNames = @{
  "01"="架构设计"; "02"="架构评估"; "03"="可靠性设计"; "04"="安全架构";
  "05"="微服务与云原生"; "06"="大数据与NoSQL"; "07"="SOA"; "08"="基于构件";
  "09"="架构演化"; "10"="设计模式"; "11"="企业应用集成"; "12"="测试与质量"; "13"="DevOps与Serverless"
}

# 预加载专题提纲：万能提纲 section
$topicOutlines = @{}
Get-ChildItem "$topicsDir\*.md" | Where-Object { $_.Name -ne "README.md" } | ForEach-Object {
  $no = $_.Name.Substring(0,2)
  $c = Get-Content $_.FullName -Raw -Encoding UTF8
  $outline = ""
  if ($c -match "(?s)##\s*[二2][、.]\s*万能提纲\s*\n(.*?)(?=\n##\s)") { $outline = $Matches[1].Trim() }
  elseif ($c -match "(?s)##\s*[一1][、.]\s*核心理论.*?\n(.*?)(?=\n##\s)") { $outline = $Matches[1].Trim() }
  $topicOutlines[$no] = $outline
}
Write-Output "专题提纲加载: $($topicOutlines.Count) 个"

$optionsJson = '[{"label":"摘要","req":"320字以内：项目背景+你的角色+采用的技术+落地效果（量化）"},{"label":"正文","req":"2200~2800字：项目概述、理论阐述、项目实践（重点，结合真题主题）、效果与反思"},{"label":"硬性要求","req":"每年4题选1题作答，120分钟，不少于2500字，必须有真实项目实践细节"}]'

$genericAnswer = "【审题要点】`n论文题要求结合真实项目实践论述。写作框架：`n1. 摘要（300字内）：项目背景+角色+技术方案+量化效果`n2. 第一段：项目概述与你的职责（300字）`n3. 第二段：本题核心理论阐述（600-800字）`n4. 第三段：项目中如何应用（1000字以上，全文核心，必须有具体过程/问题/方案）`n5. 第四段：效果总结与不足反思（300字）"

$content = Get-Content $essayFile -Raw -Encoding UTF8
$imported = 0; $skipped = 0

# 按 "### YYYY 年" 分节
$sections = [regex]::Matches($content, "(?ms)^### (\d{4}) 年[^\n]*\n(.*?)(?=^### \d{4} 年|\z)")
foreach ($sec in $sections) {
  $year = $sec.Groups[1].Value
  $body = $sec.Groups[2].Value
  # 表格行: | 1 | 题目 | 主题 | ... |
  $rows = [regex]::Matches($body, "(?m)^\|\s*\d+\s*\|\s*(.+?)\s*\|\s*(\d{2}|-)\s*\|")
  foreach ($row in $rows) {
    $title = $row.Groups[1].Value.Trim()
    $topicNo = $row.Groups[2].Value.Trim()
    if (-not $title -or $title -match "^[-: ]*$") { continue }
    # 跳过表头/说明行
    if ($title -eq "题目") { continue }

    $topicRef = ""
    if ($topicNo -ne "-" -and $topicNames.ContainsKey($topicNo)) {
      $topicRef = $topicNames[$topicNo]
    }

    # 参考答案：审题要点 + 专题万能提纲
    $answer = $genericAnswer
    if ($topicNo -ne "-" -and $topicOutlines[$topicNo]) {
      $answer = $genericAnswer + "`n`n【本题专题：$topicRef · 万能提纲】`n" + ($topicOutlines[$topicNo] -replace '```', "")
    }

    $analysis = "评分维度（满分75，45及格）：摘要10分+正文结构20分+实践真实度30分+文字表达15分。"
    if ($topicRef) { $analysis += "本题属【$topicRef】专题（高频主题 $topicNo 号）。" }
    else { $analysis += "本题属冷门主题（需求工程/信息系统/综合管理类），可套用通用论文框架作答。" }
    $analysis += "判卷核心：理论联系实际，第三部分项目实践必须有具体细节。"

    $stem = "【${year}年真题】$title`n`n请围绕本题撰写论文（摘要+正文）。"
    $payload = [ordered]@{
      source = "REVIEW"; subject = "论文"; type = "ESSAY"; domainId = 11
      stem = $stem; optionsJson = $optionsJson; answer = $answer; analysis = $analysis
    }
    $json = $payload | ConvertTo-Json -Depth 8
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    try {
      $r = Invoke-RestMethod -Uri "http://localhost:8080/api/questions" -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 30
      $imported++
      $tag = if ($topicRef) { "[$topicRef]" } else { "[冷门]" }
      Write-Output "[OK] $year $tag $title (id=$($r.data.id))"
    } catch {
      $skipped++
      Write-Output "[FAIL] $year $title : $($_.Exception.Message)"
    }
  }
}
Write-Output "===== 论文题导入完成: 成功=$imported 失败=$skipped ====="
