#Requires -Version 5.1
<#
.SYNOPSIS
    在项目根目录初始化 Git（若尚无）、提交全部文件并推送到你新建的 GitHub 仓库。

.USAGE（在 Cursor / PowerShell 中，先 cd 到项目根目录）
    .\scripts\push-to-github.ps1 -RemoteUrl "https://github.com/你的用户名/仓库名.git"

前置条件：
  - 已安装 Git for Windows：https://git-scm.com/download/win（装好后重启终端）
  - 已在 github.com 上创建一个空仓库（不要用 README 初始化，避免首次推送冲突）
  - 已配置 GitHub 登录（HTTPS：凭据管理器 / PAT；或 SSH：https://github.com/settings/keys）

后续部署：
  - 打开 https://vercel.com → Import 上述仓库 → Deploy → 得到 https://xxx.vercel.app 即发给朋友。
  - 可选：在 Vercel Settings → Environment Variables 设置 ALLOWED_EDIT_IPS（逗号分隔公网 IP）
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteUrl
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
    $cmd = Get-Command git -ErrorAction Stop
    return $cmd.Source
  }
  catch {
    return $null
  }
}

$gitExe = Find-Git
if (-not $gitExe) {
  Write-Host "未找到 Git。请先安装 Git for Windows 并重启终端：https://git-scm.com/download/win" -ForegroundColor Red
  exit 1
}

# 仓库根目录（与 scripts 同级）
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

if (-not (Test-Path -LiteralPath ".git")) {
  Write-Host "正在 git init ..."
  & $gitExe init
}

& $gitExe add -A
$status = & $gitExe status --porcelain
if (-not $status) {
  Write-Host "没有变更可提交。"
}
else {
  Write-Host "正在 git commit ..."
  & $gitExe commit -m "Initial commit: resume portfolio site"
}

& $gitExe branch -M main 2>$null

$remotes = & $gitExe remote
if ($remotes -contains "origin") {
  Write-Host "设置 remote origin 为：$RemoteUrl"
  & $gitExe remote set-url origin $RemoteUrl
}
else {
  Write-Host "添加 remote origin ..."
  & $gitExe remote add origin $RemoteUrl
}

Write-Host "`n正在推送到 GitHub（若弹出登录请按提示操作）..."
& $gitExe push -u origin main

Write-Host "`n完成。下一步：登录 https://vercel.com → Import Git Repository → 选择该仓库 → Deploy。"
Write-Host "部署完成后把 https://你的项目.vercel.app 发给朋友即可。" -ForegroundColor Green
