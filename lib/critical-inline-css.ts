/**
 * 首屏内联兜底样式：即使 `/_next/static/css/app/layout.css` 因 dev 缓存、
 * 内置浏览器或隧道场景未加载，仍保证主题色与基础排版可读。
 * 完整 Tailwind 仍依赖 globals.css 外链。
 */
export const CRITICAL_INLINE_CSS = `
html, body { margin: 0; min-height: 100%; box-sizing: border-box; }
*, *::before, *::after { box-sizing: inherit; }
html {
  scroll-behavior: smooth;
  background-color: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
body { background-color: rgb(var(--color-paper)); color: rgb(var(--color-ink)); }
html[data-theme="paper"] {
  --color-paper: 250 251 252; --color-ink: 29 34 38; --color-ink-muted: 100 106 115;
  --color-line: 226 232 240; --color-surface: 255 255 255; --selection: 10 102 194;
}
html[data-theme="ink"] {
  --color-paper: 15 15 18; --color-ink: 245 245 247; --color-ink-muted: 152 152 162;
  --color-line: 48 48 56; --color-surface: 28 28 34; --selection: 255 255 255;
}
html[data-theme="warm"] {
  --color-paper: 252 248 242; --color-ink: 42 35 30; --color-ink-muted: 120 105 94;
  --color-line: 235 225 214; --color-surface: 255 255 255; --selection: 120 80 40;
}
html[data-theme="editorial"] {
  --color-paper: 245 243 238; --color-ink: 26 24 22; --color-ink-muted: 95 90 84;
  --color-line: 228 224 216; --color-surface: 252 251 248; --selection: 40 36 30;
}
html[data-theme="ocean"] {
  --color-paper: 247 250 252; --color-ink: 22 40 52; --color-ink-muted: 88 108 124;
  --color-line: 220 230 240; --color-surface: 255 255 255; --selection: 10 102 194;
}
#intro, #resume, #portfolio {
  scroll-margin-top: calc(2.875rem + env(safe-area-inset-top, 0px));
}
`;
