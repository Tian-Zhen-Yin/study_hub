# 导入论文万能模板备考资料(data/papers/)到「论文写作」节点(domainId=11)
# 三份材料合并为一条 ESSAY 备考资料题：stem=使用说明，answer=模板+范文+模块库全文
# 带查重：按 stem 识别已有记录则 PUT 更新 answer/analysis（PUT 不支持 stem，故查重 key 用 stem）
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:Path = "C:\Windows\System32;C:\Windows;" + $env:Path

$papersDir = Join-Path $PSScriptRoot "..\papers"
$api = "http://localhost:8080/api/questions"
$marker = "论文万能模板备考资料"

# 读取三份材料
$f1 = Get-Content "$papersDir\01-template.md" -Raw -Encoding UTF8
$f2 = Get-Content "$papersDir\02-essay-microservice-agent.md" -Raw -Encoding UTF8
$f3 = Get-Content "$papersDir\03-modules.md" -Raw -Encoding UTF8

$answer = @"
================================================================
【第一部分】万能模板（六段式骨架 + 真题适配速查表 + 机考画图策略）
================================================================
$($f1.Trim())

================================================================
【第二部分】完整范文（微服务+AI Agent+财务分析，摘要+正文约3000字）
================================================================
$($f2.Trim())

================================================================
【第三部分】六类考题可替换模块库（按考题类别组装正文第三、四段）
================================================================
$($f3.Trim())
"@

$stem = @"
【备考资料】$marker

本资料为「微服务+AI Agent+财务分析」万能模板体系，适配历年论文真题。
answer 字段包含三部分完整内容：
1. 万能模板：项目素材卡、六段式骨架、写作公式、历年真题适配速查表、考场时间分配、机考画图策略、考前准备清单
2. 完整范文：可直接背诵参考的标杆范文（含分布式事务/熔断降级/幂等性设计、技术选型对比）
3. 模块库：六类考题（分布式事务、可靠性、性能优化、数据仓库、DDD、大模型应用）的可替换模块

使用方法：刷论文真题时对照本资料，按真题类别从速查表选骨架，从模块库取对应模块组装正文。
"@

$optionsJson = '[{"label":"资料性质","req":"非真题，为个人备考模板资料，配合 domainId=11 下的历年论文真题使用"},{"label":"核心策略","req":"一核多变：宿主项目素材固定，六段式骨架固定约1200字背熟，替换部分约1700字按考题类别组装"},{"label":"考场红线","req":"摘要禁止图表；复杂图不画；简单表格可选加分；文字描述保底"}]'

$analysis = "使用指南：先看第一部分万能模板掌握整体方法论；背诵第二部分范文中的固定段落（摘要公式、项目概述、效果总结约1200字）；考场上按考题类别查适配速查表，从第三部分模块库取2个设计子节组装正文核心段落。判卷核心：理论联系实际，项目实践必须有具体细节（本资料已内置财务归因数据、故障实战案例、团队冲突细节三个反模板护城河）。"

# 查重：拉取 domainId=11 全部题目，按 stem 含标记串匹配
$existing = $null
try {
  $list = Invoke-RestMethod -Uri "$api`?domainId=11&count=200" -Method Get -TimeoutSec 30
  $existing = $list.data | Where-Object { $_.stem -like "*$marker*" } | Select-Object -First 1
} catch {
  Write-Output "[WARN] 查重查询失败，将直接创建: $($_.Exception.Message)"
}

$json = $null
$bytes = $null

if ($existing) {
  # PUT 更新（仅支持 optionsJson/answer/analysis）
  $payload = [ordered]@{ optionsJson = $optionsJson; answer = $answer; analysis = $analysis }
  $json = $payload | ConvertTo-Json -Depth 8
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  try {
    Invoke-RestMethod -Uri "$api/$($existing.id)" -Method Put -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 60 | Out-Null
    Write-Output "[UPDATE] 已更新既有备考资料题 (id=$($existing.id))，answer 长度=$($answer.Length) 字符"
  } catch {
    Write-Output "[FAIL] 更新失败: $($_.Exception.Message)"
    exit 1
  }
} else {
  # POST 创建
  $payload = [ordered]@{
    source = "MANUAL"; subject = "备考资料"; type = "ESSAY"; domainId = 11
    stem = $stem; optionsJson = $optionsJson; answer = $answer; analysis = $analysis
  }
  $json = $payload | ConvertTo-Json -Depth 8
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  try {
    $r = Invoke-RestMethod -Uri $api -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 60
    Write-Output "[OK] 备考资料题创建成功 (id=$($r.data.id))，answer 长度=$($answer.Length) 字符"
  } catch {
    Write-Output "[FAIL] 创建失败: $($_.Exception.Message)"
    exit 1
  }
}
Write-Output "===== 论文备考资料导入完成 ====="
