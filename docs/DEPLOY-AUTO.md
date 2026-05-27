# 推代码后自动部署到阿里云（GitHub Actions）

在本机改完代码并 `git push` 到 GitHub 后，会自动 SSH 到你的轻量服务器执行 `scripts/server-deploy.sh`（拉代码 → 安装依赖 → 构建 → 重启 PM2），**无需再手动登录服务器**。

网页里编辑的简历内容仍在服务器 `data/published-site.json`，自动部署**不会**删除该文件。

---

## 一、服务器一次性准备

### 1. 基础环境（若尚未安装）

```bash
# Ubuntu 示例
sudo apt update
sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2. 克隆仓库（只需做一次）

```bash
cd ~
git clone https://github.com/你的用户名/你的仓库名.git Resume_Web
cd Resume_Web
```

若仓库在子目录，请保证 `DEPLOY_PATH` 指向含 `package.json` 的那一层。

### 3. 环境变量与首次构建

```bash
cp .env.example .env.local
nano .env.local   # 填写 NODE_ENV=production、ALLOWED_EDIT_IPS=你的公网IP 等

npm install
npm run build
chmod +x scripts/server-pm2-start.sh scripts/server-deploy.sh
./scripts/server-pm2-start.sh
pm2 startup       # 按提示执行，开机自启
```

确认浏览器能打开站点后，继续下面 GitHub 配置。

### 4. 为自动部署准备 SSH 密钥（在服务器上执行）

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys ~/.ssh/github_deploy
```

把 **私钥** 全部复制出来（下一步贴到 GitHub）：

```bash
cat ~/.ssh/github_deploy
```

**粘贴到 GitHub 时务必：**

- 从 `-----BEGIN` 到 `-----END` **整段、多行**粘贴（最后一行末尾的 `=` 也要保留）
- 不要合并成一行；不要首尾加引号或空格
- 若 Actions 报 `ssh: no key found`，请 **删除** `SSH_PRIVATE_KEY` 后重新粘贴，或改用 PEM 格式：

```bash
ssh-keygen -p -m PEM -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy
```

也可使用 Base64（更不易丢换行）：`cat ~/.ssh/github_deploy | base64 -w 0`，整段输出存为 Secret `SSH_PRIVATE_KEY_B64`（需 workflow 支持，默认用多行私钥即可）。

---

## 二、GitHub 仓库配置 Secrets

打开 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**，添加：

| Secret 名称 | 示例 / 说明 |
|-------------|-------------|
| `SSH_HOST` | 服务器公网 IP，如 `47.96.xxx.xxx` |
| `SSH_USER` | SSH 用户名，如 `root` 或 `admin` |
| `SSH_PRIVATE_KEY` | 上一步 `github_deploy` 私钥全文（含 `BEGIN`/`END` 行） |
| `DEPLOY_PATH` | 项目绝对路径，如 `/root/Resume_Web` |
| `SSH_PORT` | 可选，默认 `22` |
| `SKIP_BUILD_CHECKS` | 可选，内存很小的机器填 `1` |

保存后，推送代码到 `main` 或 `master` 分支即可触发部署。

---

## 三、本机日常流程

```powershell
cd 你的项目根目录
git add -A
git commit -m "更新说明"
git push origin main
```

推送后：

1. 打开 GitHub 仓库 → **Actions** → 查看 **Deploy to server** 是否绿色成功  
2. 约 1～3 分钟（视构建速度）后刷新你的网站查看效果  

也可在 Actions 里点 **Run workflow** 手动部署。

---

## 四、常见问题

**Actions 报 Permission denied (publickey)**  
- 检查 `SSH_PRIVATE_KEY` 是否完整、`SSH_USER` / `SSH_HOST` 是否正确  
- 确认公钥已写入服务器 `~/.ssh/authorized_keys`  

**Actions 成功但网站仍是旧的**  
- 看日志里 `npm run build` 是否失败  
- 服务器执行 `pm2 logs resume-web`  

**构建超时或内存不足**  
- 在 GitHub Secrets 增加 `SKIP_BUILD_CHECKS` = `1`  
- 或在服务器上先手动 `npm run build` 一次  

**只想改简历文案、不改代码**  
- 在网页里编辑即可，会写入 `data/published-site.json`，**不用** push 代码  

**仓库是私有的，服务器上 git pull 要密码**  
- 在服务器为该仓库配置只读 Deploy Key（GitHub 仓库 → Settings → Deploy keys），或把 remote 改为 SSH：`git remote set-url origin git@github.com:用户名/仓库名.git`  

---

## 五、安全建议

- 部署专用密钥不要用于其他用途；不要用 root 时可单独建系统用户并限制目录权限  
- 勿把 `.env.local`、`data/published-site.json` 提交到 GitHub（已在 `.gitignore`）  
