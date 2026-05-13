#!/usr/bin/env bash
# 在 Ubuntu 服务器上、项目根目录（含 package.json）执行：
#   chmod +x scripts/server-pm2-start.sh
#   ./scripts/server-pm2-start.sh
# 或指定目录：./scripts/server-pm2-start.sh /home/admin/Resume_Web
set -euo pipefail

ROOT="${1:-$(pwd)}"
cd "$ROOT"

if [[ ! -f package.json ]]; then
  echo "错误：在 $ROOT 未找到 package.json"
  exit 1
fi

if [[ ! -d .next ]]; then
  echo "错误：未找到 .next，请先在项目根目录执行："
  echo "  SKIP_BUILD_CHECKS=1 npm run build"
  exit 1
fi

export HOSTNAME=0.0.0.0
export PORT="${PORT:-3000}"

pm2 delete resume-web 2>/dev/null || true
pm2 start npm --name resume-web -- start
pm2 save
echo ""
echo "当前 PM2 进程："
pm2 list
