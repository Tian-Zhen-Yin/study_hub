@echo off
rem 手动启动 Study Hub（无窗口后台运行）
schtasks /run /tn StudyHub >nul 2>&1
if %errorlevel%==0 (
  echo 已通过计划任务 StudyHub 启动
) else (
  echo 计划任务不可用,直接以 javaw 启动
  cd /d E:\AiProject\study_hub
  start "" "D:\DevInstall\Java\jdk-17.0.1\bin\javaw.exe" -jar target\study-hub-1.0.0.jar
)
