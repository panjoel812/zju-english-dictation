#!/bin/zsh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

if [[ ! -d node_modules ]]; then
  echo "未找到 node_modules，请先在项目目录执行 npm install。"
  read -r "?按回车键退出..."
  exit 1
fi

PORT=5174
URL="http://localhost:${PORT}/"

if curl -fsS "$URL" >/dev/null 2>&1; then
  echo "浙江大学英语 III 已经在运行: ${URL}"
  open "$URL"
  exit 0
fi

echo "正在启动浙江大学英语 III..."
echo "访问地址: ${URL}"
(sleep 2; open "$URL") &
npm run dev -- --host 127.0.0.1 --port "$PORT"
