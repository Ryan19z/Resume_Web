/** 使用说明弹窗内展示的纯文本（避免运行时读取 md 文件） */
export const HELP_GUIDE_TEXT = {
  zh: `
【首次进入，请按这 6 步操作】
1) 先看顶部导航：HOME（首页）/ RESUME（履历）/ WORK（作品）。
2) 打开左下「行业模板」，先选与你最接近的职业模板。
3) 回到 HOME，补全姓名、意向岗位、一句话介绍与 2-4 条亮点。
4) 进入 RESUME，完善工作经历与教育（支持新增 / 编辑 / 删除）。
5) 进入 WORK，至少添加 2 个代表作品（封面 + 外链）。
6) 点右上「分享」，复制链接或发邮件给 HR/客户。

【如何编辑内容（有编辑权限时）】
- 首页可直接点文字修改：姓名、岗位、简介、亮点会自动保存。
- 右下「站点编辑」用于编辑页面文案、背景、联系方式等全局内容。
- 履历与作品支持增删改；代表项目支持图片/视频/代码/链接/文档。

【看不到编辑按钮怎么办】
- 说明当前是只读模式，通常是 IP 不在白名单。
- 让站长把你的公网 IP 加入 ALLOWED_EDIT_IPS 后刷新。

【背景和展示建议】
- 背景建议使用高清横图（推荐 1920x1080 或更高）。
- 作品卡片优先放“最能证明能力”的内容，不要堆太多。
- 每次改完先点预览自查，再分享。

【数据保存说明】
- 内容保存于当前浏览器；换设备或清缓存后可能看不到本地草稿。
- 重要版本建议及时发布并备份。
`.trim(),
  en: `
[First-time quick start: follow these 6 steps]
1) Use top navigation: HOME / RESUME / WORK.
2) Open "Industry template" at bottom-left and pick the closest profile.
3) Go to HOME and complete name, target role, one-line intro, and 2-4 highlights.
4) Go to RESUME and finish experience + education (add / edit / delete supported).
5) Go to WORK and add at least 2 representative projects (cover + link).
6) Click "Share" on top-right to copy link or send by email.

[How editing works (when you have permission)]
- On HOME, click text directly to edit; changes auto-save after a short pause.
- Use bottom-right "Site Editor" for global copy, background, and contact fields.
- Resume and work items support add/edit/delete.
- Spotlight and project entries support image/video/code/link/document.

[If edit controls are missing]
- You are in read-only mode, usually because your IP is not whitelisted.
- Ask the owner to add your public IP to ALLOWED_EDIT_IPS, then refresh.

[Visual quality tips]
- Use high-resolution wide background images (1920x1080+ recommended).
- Keep projects focused on proof of capability, not quantity.
- Always check Preview before sharing.

[Data note]
- Content is saved in this browser.
- Drafts may not carry over after switching devices or clearing browser storage.
`.trim(),
} as const;
