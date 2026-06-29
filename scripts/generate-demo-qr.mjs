#!/usr/bin/env node
/** 生成演示用占位二维码 PNG（扫描内容为 demo-placeholder，无实际跳转） */
import path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "public", "placeholders", "demo-contact-qr.png");

await QRCode.toFile(out, "demo-placeholder", {
  width: 320,
  margin: 2,
  color: { dark: "#1a1a1a", light: "#ffffff" },
});

console.log(`Wrote ${path.relative(path.join(__dirname, ".."), out)}`);
