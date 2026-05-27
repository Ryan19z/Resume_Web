#!/usr/bin/env bash
# 在阿里云 Workbench 执行一次：修正 PM2、检查 3000 端口与本地访问
# 用法：bash scripts/server-fix-online.sh
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$HOME/Resume_Web}"
RELEASE_DIR="${DEPLOY_PATH}/release"

echo "==> 部署目录: ${DEPLOY_PATH}"

if [[ ! -f "${RELEASE_DIR}/server.js" ]]; then
  echo "错误：未找到 ${RELEASE_DIR}/server.js"
  echo "请先确保 GitHub Actions deploy 已成功，或手动解压 deploy-bundle.tar.gz 到 release/"
  exit 1
fi

[[ -f "${DEPLOY_PATH}/.env.local" ]] && ln -sf "${DEPLOY_PATH}/.env.local" "${RELEASE_DIR}/.env.local" || true
mkdir -p "${DEPLOY_PATH}/data"

export SITE_PUBLISH_PATH="${DEPLOY_PATH}/data/published-site.json"
export PM2_CWD="${RELEASE_DIR}"

pm2 delete resume-web 2>/dev/null || true
pm2 delete all 2>/dev/null || true

if [[ -f "${DEPLOY_PATH}/scripts/ecosystem.production.cjs" ]]; then
  SITE_PUBLISH_PATH="${SITE_PUBLISH_PATH}" PM2_CWD="${RELEASE_DIR}" \
    pm2 start "${DEPLOY_PATH}/scripts/ecosystem.production.cjs"
else
  cd "${RELEASE_DIR}"
  HOSTNAME=0.0.0.0 PORT=3000 SITE_PUBLISH_PATH="${SITE_PUBLISH_PATH}" \
    pm2 start server.js --name resume-web
fi

pm2 save
echo ""
pm2 describe resume-web | head -20
echo ""
echo "==> 本机监听端口："
ss -tlnp 2>/dev/null | grep 3000 || netstat -tlnp 2>/dev/null | grep 3000 || true
echo ""
echo "==> 本机 curl："
curl -sI --connect-timeout 3 "http://127.0.0.1:3000" | head -5 || echo "本机 3000 无响应"
echo ""
echo "==> 公网 IP（请在浏览器用 http://此IP:3000 访问，不要用 172.x）："
curl -s --connect-timeout 2 ifconfig.me 2>/dev/null || curl -s ip.sb 2>/dev/null || hostname -I
echo ""
echo "若本机 curl 有 HTTP/1.1 200 但外网打不开，请到阿里云控制台 → 轻量服务器 → 防火墙，放行 TCP 3000"
