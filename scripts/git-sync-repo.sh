#!/usr/bin/env bash
# 将工作区同步为 origin 上的指定分支（自动部署标准做法）
# 会丢弃「已跟踪文件」的本地修改；.env.local、data/published-site.json 等在 .gitignore 中，不会被删除
set -euo pipefail

BRANCH="${1:-main}"
ROOT="${2:-.}"
cd "$ROOT"

if [[ ! -d .git ]]; then
  echo "[git-sync] 错误：$ROOT 不是 Git 仓库" >&2
  exit 1
fi

echo "[git-sync] fetch origin/${BRANCH} ..."
git fetch origin "${BRANCH}"

if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  echo "[git-sync] 检测到本地已修改的跟踪文件，将重置为 origin/${BRANCH}："
  git status -s || true
fi

git reset --hard "origin/${BRANCH}"
echo "[git-sync] 当前版本: $(git rev-parse --short HEAD) $(git log -1 --oneline)"
