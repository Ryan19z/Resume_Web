#!/usr/bin/env bash
# 从 .env.local 加载变量后启动 PM2（standalone 必须让进程读到 ALLOWED_EDIT_IPS）
set -euo pipefail

DEPLOY_PATH="${1:-$HOME/Resume_Web}"
RELEASE_DIR="${DEPLOY_PATH}/release"

load_env_file() {
  local env_file="$1"
  [[ -f "$env_file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" == *"="* ]] || continue
    local key="${line%%=*}"
    local value="${line#*=}"
    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    if [[ "$value" =~ ^\".*\"$ || "$value" =~ ^\'.*\'$ ]]; then
      value="${value:1:${#value}-2}"
    fi
    export "$key=$value"
  done < "$env_file"
}

if [[ ! -f "${RELEASE_DIR}/server.js" ]]; then
  echo "错误：未找到 ${RELEASE_DIR}/server.js"
  exit 1
fi

mkdir -p "${DEPLOY_PATH}/data"
[[ -f "${DEPLOY_PATH}/.env.local" ]] && ln -sf "${DEPLOY_PATH}/.env.local" "${RELEASE_DIR}/.env.local"

if [[ -f "${DEPLOY_PATH}/.env.local" ]]; then
  load_env_file "${DEPLOY_PATH}/.env.local"
  echo "[pm2] 已加载 ${DEPLOY_PATH}/.env.local"
  echo "[pm2] ALLOWED_EDIT_IPS=${ALLOWED_EDIT_IPS:-（未设置）}"
else
  echo "[pm2] 警告：未找到 .env.local"
fi

export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"
export NODE_ENV="${NODE_ENV:-production}"
export SITE_PUBLISH_PATH="${SITE_PUBLISH_PATH:-${DEPLOY_PATH}/data/published-site.json}"

cd "${RELEASE_DIR}"
if pm2 describe resume-web >/dev/null 2>&1; then
  pm2 restart resume-web --update-env
else
  pm2 start server.js --name resume-web
fi
pm2 save 2>/dev/null || true
pm2 list
echo ""
echo "请在浏览器打开: http://你的公网IP:3000/api/can-edit"
echo "应看到 canEdit:true 且 ip 为你的公网 IP"
