import { ThemeProvider } from "@/context/ThemeProvider";
import { CRITICAL_INLINE_CSS } from "@/lib/critical-inline-css";
import { themeBootstrapInlineScript } from "@/lib/theme-inline-script";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "简历",
  description: "极简个人简历",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeBootstrap = themeBootstrapInlineScript();
  return (
    <html lang="zh-CN" data-theme="paper" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <style
          id="critical-layout-fallback"
          dangerouslySetInnerHTML={{ __html: CRITICAL_INLINE_CSS }}
        />
        {/**
         * 勿在根 layout 手写 `<head>` + `next/script` beforeInteractive：在 Next 15
         * 与流式元数据合并时，二次请求/刷新曾出现整页 Internal Server Error。
         * 主题首帧脚本放 body 最前，与官方「根 layout 仅 html/body」约定一致。
         */}
        <script
          id="resume-theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
