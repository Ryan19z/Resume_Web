#Requires -Version 5.1
<#
.SYNOPSIS
    提交当前代码并推送到 GitHub；推送成功后 GitHub Actions 会自动部署到阿里云。

.USAGE
    cd 项目根目录
    .\scripts\sync-to-github.ps1
    .\scripts\sync-to-github.ps1 -CommitMessage "fix: 修复某某问题"
    .\scripts\sync-to-github.ps1 -RemoteUrl "https://github.com/用户名/仓库名.git"

前置：已安装 Git for Windows，且已配置 GitHub 登录（HTTPS 凭据或 SSH）。
详见 docs/DEPLOY-AUTO.md
#>
param(
  [string]$CommitMessage = "chore: sync latest portfolio site changes",
  [string]$RemoteUrl = ""
)

$ErrorActionPreference = "Stop"

function Find-Git {
  $candidates = @(
    "${env:ProgramFiles}\Git\bin\git.exe",
    "${env:ProgramFiles(x86)}\Git\bin\git.exe",
    "${env:LOCALAPPDATA}\Programs\Git\bin\git.exe"
  )
  foreach ($p in $candidates) {
    if ($p -and (Test-Path -LiteralPath $p)) { return $p }
  }
  try {
    return (Get-Command git -ErrorAction Stop).Source
  }
  catch {
    return $null
  }
}

$gitExe = Find-Git
if (-not $gitExe) {
  Write-Host "未找到 Git。请安装 https://git-scm.com/download/win 后重开终端再试。" -ForegroundColor Red
  exit 1
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

if (-not (Test-Path -LiteralPath ".git")) {
  Write-Host "正在初始化 Git 仓库..."
  & $gitExe init
  & $gitExe branch -M main
}

if ($RemoteUrl) {
  $remotes = & $gitExe remote
  if ($remotes -contains "origin") {
    & $gitExe remote set-url origin $RemoteUrl
  }
  else {
    & $gitExe remote add origin $RemoteUrl
  }
}

$origin = & $gitExe remote get-url origin 2>$null
if (-not $origin) {
  Write-Host "尚未配置 GitHub 远程地址。请执行：" -ForegroundColor Yellow
  Write-Host '  .\scripts\sync-to-github.ps1 -RemoteUrl "https://github.com/你的用户名/仓库名.git"' -ForegroundColor Cyan
  exit 1
}

Write-Host "远程仓库：$origin"
& $gitExe add -A
$status = & $gitExe status --porcelain
if (-not $status) {
  Write-Host "没有新的代码变更，跳过提交。" -ForegroundColor Yellow
}
else {
  Write-Host "正在提交..."
  & $gitExe commit -m $CommitMessage
}

Write-Host "`n正在推送到 GitHub（若提示登录请按指引操作）..."
& $gitExe push -u origin main

Write-Host "`n已推送。请在 GitHub 仓库 → Actions 查看 Deploy to server 是否成功（约 1～3 分钟）。" -ForegroundColor Green
Write-Host "也可在 Actions 页手动 Run workflow 触发部署。"
