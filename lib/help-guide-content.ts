/** 使用说明弹窗内展示的纯文本（与 SiteTourDriver 9 步引导一一对应） */

export const HELP_GUIDE_TEXT = {
  zh: `
【9 步上手流程（与页面分步引导一致）】

1) 分区导航与分享
   顶部「首页 / 履历 / 作品」可平滑滚动；右侧「分享」可复制 ViewURL、发邮件或生成二维码给 HR。

2) 预览与使用说明
   右上角「预览」模拟 HR 只读视角；「使用说明」即本页；可切换 EN / 中文（若未锁定语言）。

3) 智能导入简历（推荐）
   右下角「智能导入简历」上传 PDF / Word / 纯文本，自动填入各区块。
   导入前可看「服务承诺边界」；导入后务必看质量评分与核对清单，再点「确认填入站点」。

4) 首屏就地编辑
   首页直接点文字改姓名、意向岗位、简介、亮点、联系方式（停顿后自动保存）。
   右侧展示窗可切换「重点展示 / 证件照」；也可在「站点编辑 → 首屏与形象」集中上传形象照与二维码。

5) 履历区
   含工作经历、项目经历、教育背景；点击卡片展开详情，可增删改。
   教育卡片含校园成果；每条经历可挂代表项目（图 / 视频 / 代码 / 链接 / 文档）。

6) 作品区
   展示精选案例：标题 + 封面 + 外链，建议至少 2 个；点击卡片打开外部链接。

7) 站点编辑与链接工具
   「站点编辑」：首屏与形象、履历页用词、作品页用词（口令设置不在此菜单内）。
   同区域独立入口：「链接安全」（EditURL 口令）、「链接访问记录」（HR 是否打开 ViewURL）。

8) 分享简历
   满意后点「分享」：复制链接（自动去掉 editToken）、二维码或发邮件。
   localhost 调试时对方打不开，需部署到公网后再分享。

9) 主题与背景
   左下角「主题」切换配色（墨 / 暖 / 编辑 / 海洋等），可选纯色纸面、自定义图片或轻柔流光。

【首次进入编辑链接】
· 会自动弹出本说明；点底部「开始 9 步引导」可跟着页面高亮逐步走一遍（约 1 分钟）。
· 若设置了编辑口令，需先验证口令再编辑。HR 只读链接不会看到本说明与引导。

【智能导入：承诺 / 不承诺】
· 承诺：快速初稿 + 质量评分与核对清单；您仍需核对后再分享。
· 不承诺：任意排版 100% 准确；扫描件无 OCR 必成功；零编辑即可投递。

【编辑入口速查】
· 就地编辑：首页点文字即改。
· 智能导入 / 链接安全 / 访问记录 / 站点编辑：均在右下角。
· 履历与作品卡片：进入对应分区后增删改。

【保存与分享前】
· EditURL：改动同步到服务器发布版，HR 的 ViewURL 看到最新内容。
· 分享前自查：姓名、岗位、联系方式；至少 1 段教育与若干经历 / 作品；手机竖屏预览一遍。

【常见问题】
· 看不到编辑按钮 → 确认使用完整 EditURL（含 editToken），或联系管理员。
· 导入字段不对 → 手动改；尽量用文字版 PDF/Word。
· 视频无法播放 → 用 YouTube / B站 公开页链接。
· 页面点不动 → 刷新；若刚中断引导，也请先刷新。
`.trim(),
  en: `
[9 steps — matches the on-page guided tour]

1) Nav & share
   Top Home / Resume / Work scrolls smoothly; Share copies View URL, email, or QR for HR.

2) Preview & guide
   Preview simulates HR read-only view; this dialog is the full guide; switch EN / 中文 when allowed.

3) Smart import (recommended)
   Smart Import bottom-right: PDF / Word / text → auto-fill sections.
   Read service limits before upload; check score & checklist before Apply to site.

4) Hero inline edit
   Click text on Home for name, role, tagline, highlights, contacts (auto-save).
   Aside panel: spotlight vs portrait; or Site Editor → Profile & hero for photos & QR codes.

5) Resume section
   Experience, projects, education; expand cards to edit.
   Campus blocks on education; representative projects support media / code / links / docs.

6) Work (portfolio)
   Showcase pieces: title + cover + link; at least 2 recommended.

7) Site editor & link tools
   Site Editor: profile copy, resume labels, portfolio labels (PIN is not inside this menu).
   Separate buttons: Link Security (edit PIN), View Log (HR opens).

8) Share
   Share: copy link (edit token stripped), QR, or email.
   localhost links are not reachable for others — deploy first.

9) Theme & background
   Bottom-left Theme for palette and page background (paper / image / gradient).

[First Edit URL visit]
· This guide opens automatically; tap "Start 9-step tour" below for the highlighted walkthrough (~1 min).
· If an edit PIN is set, verify it first. HR view links never see this guide or tour.

[Smart import: promise / limits]
· We provide: fast draft + score/checklist—you still review before sharing.
· We do not guarantee: perfect layout, scanned PDFs without OCR, or zero-edit ready-to-send.

[Cheat sheet]
· Inline hero edits on Home.
· Smart Import / Link Security / View Log / Site Editor: bottom-right dock.
· Resume & Work cards: edit in each section.

[Save & pre-share]
· Edit URL syncs to server publish; HR View URL shows latest content.
· Check name, role, contacts; education + experience/portfolio; preview on mobile.

[FAQ]
· No edit UI → use full Edit URL with editToken, or contact admin.
· Import mismatch → edit manually; prefer text-based files.
· Video fails → public YouTube / Bilibili URLs.
· Page frozen → refresh, especially after interrupting the tour.
`.trim(),
} as const;
