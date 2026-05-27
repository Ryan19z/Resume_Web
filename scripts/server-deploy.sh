#!/usr/bin/env bash
# 在阿里云等项目目录执行：拉取最新代码 → 安装依赖 → 构建 → 重启 PM2
# 由 GitHub Actions 推送后自动调用，也可在服务器上手动执行：
#   chmod +x scripts/server-deploy.sh && ./scripts/server-deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"

# 阿里云等国内机器访问 registry.npmjs.org 极慢，优先用项目 .npmrc（npmmirror）
export NPM_CONFIG_REGISTRY="${NPM_CONFIG_REGISTRY:-https://registry.npmmirror.com}"
export NPM_CONFIG_FETCH_TIMEOUT="${NPM_CONFIG_FETCH_TIMEOUT:-300000}"
export NPM_CONFIG_FETCH_RETRIES="${NPM_CONFIG_FETCH_RETRIES:-5}"
export NPM_CONFIG_AUDIT="${NPM_CONFIG_AUDIT:-false}"
export NPM_CONFIG_FUND="${NPM_CONFIG_FUND:-false}"
# 小内存轻量机避免 build 时 OOM
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"

echo "========================================"
echo "[deploy] 开始 $(date -Iseconds 2>/dev/null || date)"
echo "[deploy] 目录: $ROOT"
echo "========================================"

if [[ ! -d .git ]]; then
  echo "[deploy] 错误：当前目录不是 Git 仓库，请先 git clone 你的 GitHub 仓库到此目录。"
  exit 1
fi

echo "[deploy] git pull (${DEPLOY_BRANCH})..."
git fetch origin "${DEPLOY_BRANCH}"
git pull origin "${DEPLOY_BRANCH}" --ff-only

echo "[deploy] node $(node -v 2>/dev/null || echo '?') npm $(npm -v 2>/dev/null || echo '?')"
echo "[deploy] npm registry: $(npm config get registry)"

echo "[deploy] npm install（国内镜像，跳过 audit）..."
NPM_INSTALL_FLAGS=(--no-audit --no-fund --prefer-offline --loglevel=info)
if [[ -f package-lock.json ]]; then
  if ! npm ci "${NPM_INSTALL_FLAGS[@]}"; then
    echo "[deploy] npm ci 失败，回退 npm install..."
    npm install "${NPM_INSTALL_FLAGS[@]}"
  fi
else
  npm install "${NPM_INSTALL_FLAGS[@]}"
fi

echo "[deploy] npm run build..."
if [[ "${SKIP_BUILD_CHECKS:-}" == "1" ]]; then
  export SKIP_BUILD_CHECKS=1
fi
npm run build

mkdir -p data

if command -v pm2 >/dev/null 2>&1 && pm2 describe resume-web >/dev/null 2>&1; then
  echo "[deploy] pm2 restart resume-web"
  pm2 restart resume-web --update-env
else
  echo "[deploy] 首次启动 PM2"
  chmod +x scripts/server-pm2-start.sh
  ./scripts/server-pm2-start.sh "$ROOT"
fi

pm2 save 2>/dev/null || true

echo "[deploy] 完成 $(date -Iseconds 2>/dev/null || date)"
pm2 list 2>/dev/null || true
