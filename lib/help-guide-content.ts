/** 使用说明弹窗内展示的纯文本（避免运行时读取 md 文件） */
export const HELP_GUIDE_TEXT = {
  zh: `
【第一次使用？建议按下面顺序走一遍】

0) 新手引导
   首次用「编辑链接」打开时，每个网络（IP）会自动播放 9 步分步引导（约 1 分钟）；HR 只读链接不会播放。可随时点右上角「使用说明」，在底部「重新播放新手引导」。

1) 先认清页面结构
   顶部导航：首页 / 履历 / 作品 —— 点击可平滑滚动到对应区域。
   右上角「分享」：复制链接、发邮件或扫码，给 HR / 客户查看。

2) 确认你有没有编辑权限
   · 有权限：右下角会出现「智能导入简历」「链接安全」「链接访问记录」「站点编辑」。
   · 无权限：页面为只读浏览（HR 视角），无使用说明与新手引导；需使用站长发给你的「编辑链接」进入编辑端。

3) （最快）智能导入简历 —— 强烈推荐
   点右下角「智能导入简历」，上传 PDF / Word / 纯文本（.txt）。
   系统会自动识别姓名、联系方式、工作经历、教育背景、项目经历、奖项荣誉等，并填入对应区块。
   导入前可展开「服务承诺边界」；导入后务必查看预览页的「导入质量评分」与「核对清单」，再点「确认填入站点」。

【智能导入：我们承诺什么 / 不承诺什么】
· 承诺：快速生成可编辑初稿；提供质量评分与核对清单；不替代您核对后分享给 HR。
· 不承诺：任意排版 100% 准确；扫描件无 OCR 必成功；零编辑即可投递。
· 复杂表格、多栏 Word、图片 PDF 可能需要导入后手动调整；详见导入弹窗内「服务承诺边界」。

4) 完善首页（首屏）
   · 直接在首页点击文字，可改姓名、意向岗位、一句话介绍、核心亮点、邮箱 / 电话等（会自动保存）。
   · 或打开「站点编辑 → 首屏与形象」，集中填写形象照、辅助文案、联系二维码等。
   · 右侧展示窗可切换「重点展示 / 证件照」类预览素材。

5) 检查「履历」区
   含工作经历、项目经历、教育背景；点击卡片可展开详情。
   支持新增 / 编辑 / 删除；教育卡片里的「校园成果」可展示学业表现、主修课程、校园经历、奖项荣誉等分区。
   每条经历下的「代表项目」可挂图片、视频、代码、链接、文档。

6) 补充「作品」区
   至少放 2 个最能证明能力的作品：标题 + 封面 + 外链。
   封面点击会打开外部链接（仓库、视频页、项目页等）。

7) 调整主题与背景
   左下角「主题」可切换整站配色（墨 / 暖 / 编辑 / 海洋等）。
   还可选页面背景：纯色纸面、自定义图片、轻柔流光。

8) 预览 → 再分享
   点右上角「预览」，隐藏所有编辑入口，模拟访客视角自查排版与链接。
   满意后点「分享」：复制链接（会自动去掉编辑密钥）、生成二维码，或发送到邮箱。
   若你在 localhost 调试，对方打不开链接，需部署到公网或使用隧道后再分享。

9) （可选）链接访问记录
   右下角「链接访问记录」可查看只读链接何时被打开、来自哪里，便于跟进 HR 是否已查看。

【编辑入口速查（有权限时）】
· 首页就地编辑：点文字即改，停顿后自动保存。
· 智能导入简历：PDF / Word 一键填入。
· 链接安全：为编辑链接设置访问口令（HR 只读链接无需口令）。
· 站点编辑：首屏与形象、履历页用词、作品页用词。
· 履历 / 作品卡片：进入各分区后增删改条目。

【内容会自动保存到哪里？】
· 编辑链接（带 editToken）：改动会保存到本机浏览器，并自动同步到服务器发布版；HR 打开只读链接看到的是最新发布内容。
· 仅本机调试：主要保存在当前浏览器；换设备或清缓存可能丢失，重要内容请及时分享备份。

【分享前自查清单】
· 姓名、岗位、联系方式是否正确。
· 至少 1 段教育 + 若干经历 / 项目 / 作品，且外链可打开。
· 用手机竖屏预览一遍（Chrome 可按 F12 → 切换设备模式，或真机打开「预览」后的链接）；HR 打开的是同一链接，页面会自动适配手机排版，无需单独做移动版。
· 中英文若都要展示，请分别切换「EN / 中文」检查。

【常见问题】
· 看不到编辑按钮 → 使用编辑链接，或联系站长加 IP 白名单。
· 导入后字段不对 → 在对应分区手动改；Word / PDF 尽量用文字版，扫描件需 OCR。
· 视频 embed 失败 → 使用 YouTube / Bilibili 公开页面链接。
· 页面突然点不动 → 刷新页面；若刚中断新手引导，也请先刷新。
`.trim(),
  en: `
[First time here? Follow this order]

0) Onboarding tour
   On first visit from each network (IP) via your Edit URL, a 9-step tour auto-plays (~1 min). HR view links never show the tour. Open "Guide" top-right anytime and tap "Replay onboarding tour" at the bottom.

1) Learn the layout
   Top nav: Home / Resume / Work — smooth scroll to each section.
   "Share" top-right: copy link, email, or QR for HR / clients.

2) Check edit permission
   · With permission: bottom-right shows Smart Import, Link Security, View Log, and Site Editor.
   · Read-only (HR view): no guide or onboarding; use your Edit URL from the site owner to edit.

3) (Fastest) Smart resume import — highly recommended
   Tap "Smart Import" bottom-right; upload PDF / Word / plain text (.txt).
   Name, contact, experience, education, projects, and awards are mapped automatically.
   Expand "Service commitment & limits" before upload; on preview, check the quality score and checklist before "Apply to site".

[Smart import: what we promise / do not promise]
· We provide: fast editable draft, quality score, and checklist—not a substitute for your review before sharing.
· We do not guarantee: perfect layout for every file, scanned PDFs without OCR, or zero-edit ready-to-send resumes.
· Complex layouts may need manual fixes; see the import dialog for full terms.

4) Complete Home (hero)
   · Click text on Home to edit name, role, tagline, highlights, email / phone (auto-saves).
   · Or use Site Editor → Profile & hero for portrait, QR codes, and helper copy.
   · The aside panel supports spotlight vs. portrait preview modes.

5) Review Resume
   Work experience, project experience, and education; expand cards for details.
   Add / edit / delete entries; education "Campus" blocks cover academics, courses, activities, and awards.
   Representative projects support image / video / code / link / document.

6) Add Work (portfolio)
   At least 2 strong pieces: title + cover + external link.

7) Theme & background
   Bottom-left "Theme" for palette (Ink / Warm / Editorial / Ocean, etc.).
   Page background: solid paper, custom image, or soft gradient mesh.

8) Preview, then share
   Tap "Preview" top-right to hide edit UI and check as a visitor.
   Then "Share": copy link (edit secrets stripped), QR code, or email.
   localhost links are not reachable for others — deploy or use a tunnel first.

9) (Optional) View log
   "View Log" bottom-right shows when read-only links were opened and rough region.

[Edit entry cheat sheet]
· Inline hero edits: click text, auto-save after pause.
· Smart import: PDF / Word one-click fill.
· Link security: set an access PIN for your edit link (HR view links stay open).
· Site Editor: profile, resume copy, portfolio copy.
· Resume / Work sections: add or edit cards in place.

[Where is data saved?]
· Edit URL (with editToken): local browser draft + auto sync to server publish; HR view URL shows latest publish.
· Local dev only: mostly in this browser; switch devices or clear storage at your own risk.

[Pre-share checklist]
· Name, role, contact correct.
· Education + experience / projects / portfolio present; links work.
· Check mobile layout; switch EN / 中文 if both languages matter.

[FAQ]
· No edit controls → use Edit URL or ask for IP whitelist.
· Import mismatch → edit sections manually; prefer text-based PDF/Word over scans.
· Video embed fails → use public YouTube / Bilibili URLs.
· Page unclickable → refresh; also try refresh if onboarding was interrupted mid-tour.
`.trim(),
} as const;
