/** 需在相关功能入口提前告知用户的隐私与数据处理说明 */

export type PrivacyNoticeLang = "zh" | "en";

export const PRIVACY_NOTICES = {
  importUpload: {
    zh: "上传即表示你授权在本服务器解析简历文件；若套餐含 AI 解析，文字内容可能发送至第三方 AI 服务处理。请勿上传未取得授权的他人简历或无关敏感信息。",
    en: "By uploading, you authorize parsing on this server. If your plan includes AI parsing, text may be sent to a third-party AI service. Do not upload others' resumes without permission.",
  },
  shareViewLink: {
    zh: "分享只读链接后，对方每次打开会匿名记录时间与大致地区（不保存完整 IP 地址、不识别具体身份），便于你确认 HR 是否已查看。",
    en: "When someone opens the read-only link, we anonymously log time and approximate region (no full IP address, no personal identity) so you can see if HR viewed it.",
  },
  viewLogOwner: {
    zh: "访问记录仅编辑链接持有人可见；含打开时间、设备类型与大致地区，不含 HR 姓名、公司名或完整 IP 地址。",
    en: "Visit logs are visible only to the edit-link holder: time, device type, and approximate region—no HR name, company, or full IP address.",
  },
  hrReadOnlyFooter: {
    zh: "本页会匿名记录是否被打开及大致地区，帮助候选人确认简历已送达；不保存完整 IP 地址，也无法识别您的具体身份。记录仅供候选人确认查看情况。",
    en: "This page anonymously logs opens and approximate region so the candidate knows the resume was seen. No full IP address or personal identity is stored. Logs are for the candidate's confirmation only.",
  },
  editPin: {
    zh: "编辑口令经加密保存在服务器，工作人员无法查看或代设；忘记口令需联系管理员清除后重设。",
    en: "Your edit PIN is stored encrypted—staff cannot view or set it. If forgotten, ask the admin to clear it so you can set a new one.",
  },
  publishedContent: {
    zh: "你在站点填写并发布的姓名、联系方式、经历与作品等内容，将随只读链接对 HR 可见；请自行确认无误后再分享。",
    en: "Name, contact info, experience, and portfolio you publish will be visible to HR via the read-only link. Review before sharing.",
  },
  emailShare: {
    zh: "通过「发送到邮箱」功能时，收件地址与链接内容会经第三方邮件服务转发，请确认收件人正确。",
    en: "When using “Send by email”, recipient address and link are relayed via a third-party mail service. Verify the recipient.",
  },
  editLinkCustody: {
    zh: "持编辑链接者可修改并发布内容；建议设置编辑口令并勿将链接公开转发。给 HR 的只读链接仅可查看，无需口令。",
    en: "Anyone with the edit link can edit and publish. Set an edit PIN and avoid sharing the link publicly. The read-only link for HR is view-only and needs no PIN.",
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
    "链接分享：只读链接被打开时会匿名记录时间与大致地区，页脚对 HR 可见说明。",
    "编辑口令：仅客户自设，平台管理员不能查看原口令，只能协助清除后重设。",
    "数据存储：简历与上传文件在 linkola.cn 服务器；导入原文件不长期保存；外链素材不在本服务器。",
    "邮件分享：若启用代发邮件，收件人地址与链接经第三方邮件服务传输。",
    "客户义务：不得上传无授权的他人个人信息；分享前自行确认发布内容准确。",
  ],
  en: [
    "Smart import: files parsed on server; AI plans may call third-party LLMs; manual review required.",
    "Sharing: read-only link opens are logged anonymously (time/region); HR sees a footer notice.",
    "Edit PIN: set by customer only; operator cannot read the original PIN, only clear to reset.",
    "Storage: resume data on server; access may pause after expiry or cancellation.",
    "Email share: recipient and link may go through a third-party mail provider.",
    "Customer duty: do not upload others' personal data without consent; review before sharing.",
  ],
} as const;
