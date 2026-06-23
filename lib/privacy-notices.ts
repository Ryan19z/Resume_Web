/** 需在相关功能入口提前告知用户的隐私与数据处理说明 */

export type PrivacyNoticeLang = "zh" | "en";

export const PRIVACY_NOTICES = {
  importUpload: {
    zh: "上传即表示你授权在本服务器解析简历文件；若套餐含 AI 解析，文字内容可能发送至 DeepSeek 等第三方接口处理。请勿上传未取得授权的他人简历或无关敏感信息。",
    en: "By uploading, you authorize parsing on this server. If your plan includes AI parsing, text may be sent to third parties such as DeepSeek. Do not upload others' resumes without permission.",
  },
  shareViewLink: {
    zh: "分享只读链接后，对方每次打开会匿名记录时间与大致地区（不保存 IP 明文、不识别具体身份），便于你确认 HR 是否已查看。",
    en: "When someone opens the read-only link, we anonymously log time and approximate region (no raw IP, no identity) so you can see if HR viewed it.",
  },
  viewLogOwner: {
    zh: "访问记录仅编辑链接持有人可见；含打开时间、设备类型与大致地区，不含 HR 姓名、公司名或 IP 明文。",
    en: "Visit logs are visible only to the edit-link holder: time, device type, and approximate region—no HR name, company, or raw IP.",
  },
  hrReadOnlyFooter: {
    zh: "本页会匿名记录是否被打开及大致地区，帮助候选人确认简历已送达；不保存访问者 IP 明文，也无法识别具体身份。",
    en: "This page anonymously logs opens and approximate region so the candidate knows the resume was seen. No raw IP or personal identity is stored.",
  },
  editPin: {
    zh: "编辑口令仅以加密哈希保存在服务器，站点管理员无法查看或代设；忘记口令需联系管理员清除后重设。",
    en: "Edit PINs are stored as hashes only; admins cannot view or set them. If forgotten, ask the admin to clear it so you can set a new one.",
  },
  publishedContent: {
    zh: "你在站点填写并发布的姓名、联系方式、经历与作品等内容，将随只读链接对 HR 可见；请自行确认无误后再分享。",
    en: "Name, contact info, experience, and portfolio you publish will be visible to HR via the read-only link. Review before sharing.",
  },
  emailShare: {
    zh: "通过「发送到邮箱」功能时，收件地址与链接内容会经服务器邮件服务（如 Resend）转发，请确认收件人正确。",
    en: "When using “Send by email”, recipient address and link are relayed via the server mail service (e.g. Resend). Verify the recipient.",
  },
  editLinkCustody: {
    zh: "持 EditURL 者可编辑并发布内容；建议设置编辑口令并勿将链接公开转发。ViewURL 仅只读，无需口令。",
    en: "Anyone with the Edit URL can edit and publish. Set an edit PIN and avoid sharing the link publicly. View URL is read-only.",
  },
} as const;

export function privacyNotice(
  key: keyof typeof PRIVACY_NOTICES,
  lang: PrivacyNoticeLang,
): string {
  return PRIVACY_NOTICES[key][lang];
}

/** 管理端 / 购买前需向客户说明的要点（可写入合同或 FAQ） */
export const PRIVACY_CHECKLIST_FOR_OPERATOR = {
  zh: [
    "智能导入：文件在服务器解析，AI 套餐可能调用第三方大模型；不保证 100% 准确，需人工核对。",
    "链接分享：ViewURL 被打开时会匿名记录时间与大致地区，页脚对 HR 可见说明。",
    "编辑口令：仅客户自设，平台管理员不能查看明文，只能协助清除后重设。",
    "数据存储：简历与上传文件在 linkola.cn 服务器；导入原文件不长期保存；外链素材不在本服务器。",
    "邮件分享：若启用代发邮件，收件人地址与链接经第三方邮件服务传输。",
    "客户义务：不得上传无授权的他人个人信息；分享前自行确认发布内容准确。",
  ],
  en: [
    "Smart import: files parsed on server; AI plans may call third-party LLMs; manual review required.",
    "Sharing: View URL opens are logged anonymously (time/region); HR sees a footer notice.",
    "Edit PIN: set by customer only; operator cannot read plaintext, only clear to reset.",
    "Storage: resume data on server; access may pause after expiry or cancellation.",
    "Email share: recipient and link may go through a mail provider (e.g. Resend).",
    "Customer duty: do not upload others' personal data without consent; review before sharing.",
  ],
} as const;
