/**
 * 先启动 Next（监听 0.0.0.0），待本地端口就绪后再启动 localtunnel，
 * 便于把终端里出现的 https 链接发给朋友预览（需本机保持运行）。
 */
import http from "node:http";
import { spawn } from "node:child_process";

const PORT = Number(process.env.PORT || 3000);
const isWin = process.platform === "win32";
const npx = isWin ? "npx.cmd" : "npx";

function probeOnce() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}`, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForNextReady() {
  for (let i = 0; i < 120; i++) {
    if (await probeOnce()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `等待 http://127.0.0.1:${PORT} 超时。若端口被占用，可设置环境变量 PORT 后重试。`,
  );
}

const next = spawn(npx, ["next", "dev", "-H", "0.0.0.0", "-p", String(PORT)], {
  stdio: "inherit",
  cwd: process.cwd(),
  shell: isWin,
});

/** @type {import('node:child_process').ChildProcess | null} */
let ltProcess = null;

function shutdown(code = 0) {
  try {
    ltProcess?.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  try {
    next.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

next.on("error", (err) => {
  console.error("[dev-public-tunnel] 无法启动 Next：", err);
  process.exit(1);
});

try {
  await waitForNextReady();
} catch (e) {
  console.error("[dev-public-tunnel]", e);
  try {
    next.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  process.exit(1);
}

console.log(
  "\n本地服务已就绪。正在启动公网隧道（首次连接可能略慢）…\n" +
    "请把下方 localtunnel 输出的 https 地址发给朋友；本窗口需保持打开。\n" +
    "（若 loca.lt 打不开，可改用 package.json 里的 share:cf，需本机已安装 cloudflared。）\n",
);

ltProcess = spawn(npx, ["lt", "--port", String(PORT)], {
  stdio: "inherit",
  cwd: process.cwd(),
  shell: isWin,
});

ltProcess.on("error", (err) => {
  console.error("[dev-public-tunnel] 无法启动 localtunnel：", err);
  shutdown(1);
});

ltProcess.on("exit", (code) => {
  try {
    next.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  process.exit(code ?? 0);
});
