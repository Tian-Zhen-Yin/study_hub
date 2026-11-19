@echo off
rem 停止 Study Hub：杀掉占用 8080 端口的进程
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080 .*LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
  set FOUND=1
)
if %FOUND%==1 (
  echo 已停止 Study Hub
) else (
  echo Study Hub 未在运行
)
