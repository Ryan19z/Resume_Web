import type { NextConfig } from "next";

/**
 * 切勿在开发环境设置 `allowedDevOrigins`：一旦设置，Next 会进入 **block** 模式，
 * `/_next/*` 在 `Sec-Fetch-Mode: no-cors` 且 `Sec-Fetch-Site: cross-site` 时可能被 **403**
 *（且该分支不校验白名单）。经 trycloudflare / ngrok / localtunnel 访问时，CSS 与 JS
 * 无法加载 → 整页 Tailwind 丢失、看起来像「未排版」。
 *
 * 此前曾支持通过 `NEXT_STRICT_DEV_ORIGINS=1` 注入白名单，但在隧道场景仍会踩中上述
 * no-cors 分支，故已移除；请勿在环境变量中开启该开关。
 */
const nextConfig: NextConfig = {
  /**
   * 在 GitHub Actions 构建 standalone 包，服务器无需 npm install / next build（轻量机易超时）。
   */
  output: "standalone",
  /** 减小 framer-motion 打包体，加快非本机首屏 JS 下载与解析 */
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  transpilePackages: ["docx-preview", "pptx-preview"],
  /** 默认演示图已改为 `public/placeholders` 同域资源；若后续对远程图使用 `next/image`，在此补充 `remotePatterns`。 */
  /**
   * 不再在 dev 下强制 `cache: false`：在 Windows 上并发请求（例如快速刷新）
   * 曾与 Webpack 无缓存编译竞态叠加，出现间歇性 500（纯文本 Internal Server Error）。
   * 若仍遇 chunk 名过期，可删 `.next` 后重启 dev，或设环境变量后自行打开缓存关闭：
   * `NEXT_WEBPACK_DISABLE_CACHE=1 npm run dev`
   *
   * 若整页像「只有纯 HTML、Tailwind 全丢」：多为 `/_next/static/css/app/layout.css` 404，
   * 属 dev 缓存与 HTML 不同步。请停掉 dev 后执行 `npm run dev:fresh`（会清 `.next` 与
   * `node_modules/.cache`）再访问。
   */
  webpack: (config, { dev }) => {
    if (dev && process.env.NEXT_WEBPACK_DISABLE_CACHE === "1") {
      config.cache = false;
    }
    return config;
  },
};

/**
 * 小内存 VPS 上 `next build` 可能在「Linting and checking validity of types」阶段极慢或假死。
 * 仅在**服务器构建**时使用：`SKIP_BUILD_CHECKS=1 npm run build`
 * 本地开发请勿设置，以便继续享受类型与 ESLint 校验。
 */
if (process.env.SKIP_BUILD_CHECKS === "1") {
  nextConfig.typescript = { ignoreBuildErrors: true };
  nextConfig.eslint = { ignoreDuringBuilds: true };
}

if (process.env.NODE_ENV === "development") {
  /**
   * 首页与 dev 静态资源禁用强缓存，降低经隧道访问时「HTML 与 CSS 指纹不一致」
   * 导致 layout.css 404、整页无 Tailwind 的概率。
   */
  nextConfig.headers = async () => [
    {
      source: "/",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store, no-cache, must-revalidate, max-age=0",
        },
      ],
    },
    {
      source: "/_next/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store, no-cache, must-revalidate, max-age=0",
        },
      ],
    },
  ];
}

export default nextConfig;