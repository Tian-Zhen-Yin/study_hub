@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."

set "JAR_PATH="
for %%F in (target\study-hub-*.jar) do (
  echo %%F | findstr /i ".original" >nul || set "JAR_PATH=%%F"
)

if "%JAR_PATH%"=="" (
  echo [Study Hub] JAR not found, building with Maven...
  call mvn -B package -DskipTests
  if errorlevel 1 exit /b 1
  for %%F in (target\study-hub-*.jar) do (
    echo %%F | findstr /i ".original" >nul || set "JAR_PATH=%%F"
  )
)

echo [Study Hub] Starting on http://localhost:8080 (Embedded H2 DB)...
java -jar "%JAR_PATH%" %*
