#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

JAR_PATH="$(ls target/study-hub-*.jar 2>/dev/null | grep -v '\.original$' | head -n 1 || true)"

if [ -z "$JAR_PATH" ]; then
  echo "[Study Hub] 未发现可执行 Jar，正在使用 Maven 构建..."
  mvn -B package -DskipTests
  JAR_PATH="$(ls target/study-hub-*.jar | grep -v '\.original$' | head -n 1)"
fi

echo "[Study Hub] 启动中（默认内置 H2 文件库，访问 http://localhost:${SERVER_PORT:-8080}）..."
exec java -jar "$JAR_PATH" "$@"
