@echo off
rem 改代码后更新并重启：重新打包 + 重启计划任务
cd /d E:\AiProject\study_hub
echo 正在重新打包...
call mvn package -DskipTests -Dmaven.repo.local=.m2 -q
if %errorlevel% neq 0 (
  echo 打包失败,保持旧版本运行
  pause
  exit /b 1
)
echo 正在重启...
schtasks /end /tn StudyHub >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080 .*LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 3 /nobreak >nul
schtasks /run /tn StudyHub
echo 完成,约 15 秒后可访问 http://localhost:8080
