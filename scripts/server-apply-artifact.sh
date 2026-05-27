#!/usr/bin/env bash
# 在服务器上解压 GitHub Actions 上传的 deploy-bundle.tar.gz 并重启 PM2
# 用法：./scripts/server-apply-artifact.sh /home/admin/Resume_Web [/path/to/deploy-bundle.tar.gz]
set -euo pipefail

DEPLOY_PATH="${1:?缺少 DEPLOY_PATH}"
BUNDLE="${2:-${DEPLOY_PATH}/deploy-bundle.tar.gz}"
RELEASE_DIR="${DEPLOY_PATH}/release"

if [[ ! -f "$BUNDLE" ]]; then
  echo "[artifact] 错误：未找到 $BUNDLE"
  exit 1
fi

mkdir -p "${DEPLOY_PATH}/data" "${RELEASE_DIR}"
echo "[artifact] 解压到 ${RELEASE_DIR} ..."
rm -rf "${RELEASE_DIR:?}"/*
tar xzf "$BUNDLE" -C "$RELEASE_DIR"

if [[ ! -f "${RELEASE_DIR}/server.js" ]]; then
  echo "[artifact] 错误：包内缺少 server.js，请确认 next.config 已设置 output: standalone"
  exit 1
fi

if [[ -f "${DEPLOY_PATH}/.env.local" ]]; then
  ln -sf "${DEPLOY_PATH}/.env.local" "${RELEASE_DIR}/.env.local"
fi

export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"
export SITE_PUBLISH_PATH="${SITE_PUBLISH_PATH:-${DEPLOY_PATH}/data/published-site.json}"

cd "$RELEASE_DIR"
if command -v pm2 >/dev/null 2>&1 && pm2 describe resume-web >/dev/null 2>&1; then
  echo "[artifact] pm2 restart resume-web"
  pm2 delete resume-web 2>/dev/null || true
fi
pm2 start server.js --name resume-web
pm2 save 2>/dev/null || true
pm2 list 2>/dev/null || true
echo "[artifact] 完成。发布数据: ${SITE_PUBLISH_PATH}"
