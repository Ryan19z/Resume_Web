#!/usr/bin/env bash
# 在服务器上首次执行一次（Workbench 里复制粘贴运行）
# 用途：克隆仓库、安装依赖、首次构建、启动 PM2
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Ryan19z/Resume_Web.git}"
DEPLOY_PATH="${DEPLOY_PATH:-$HOME/Resume_Web}"
BRANCH="${BRANCH:-main}"

echo "==> 目标目录: ${DEPLOY_PATH}"

if [ ! -d "${DEPLOY_PATH}/.git" ]; then
  echo "==> git clone..."
  git clone --branch "${BRANCH}" "${REPO_URL}" "${DEPLOY_PATH}"
fi

cd "${DEPLOY_PATH}"
git fetch origin "${BRANCH}"
git pull origin "${BRANCH}" --ff-only

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "==> 已创建 .env.local，请执行: nano .env.local"
  echo "    至少设置 NODE_ENV=production 和 ALLOWED_EDIT_IPS=你的公网IP"
fi

chmod +x scripts/server-deploy.sh scripts/server-pm2-start.sh
./scripts/server-deploy.sh

echo ""
echo "==> 完成。GitHub Secret DEPLOY_PATH 请填: $(pwd)"
