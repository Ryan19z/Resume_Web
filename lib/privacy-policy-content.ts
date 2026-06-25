/** 用户向隐私政策正文（独立页面 /privacy） */

export type PrivacyPolicyLang = "zh" | "en";

export type PrivacyPolicyContent = {
  title: string;
  updatedAt: string;
  intro: string;
  sections: Array<{
    heading: string;
    paragraphs?: string[];
    bullets?: string[];
  }>;
};

export const PRIVACY_POLICY: Record<PrivacyPolicyLang, PrivacyPolicyContent> = {
  zh: {
    title: "隐私政策",
    updatedAt: "2026年6月26日",
    intro:
      "本政策面向使用「编辑链接」填写、发布与管理简历的用户，说明 Linkola 如何收集、使用与保护您的信息。使用编辑、发布、分享、智能导入等功能，即表示您已阅读并理解本政策。",
    sections: [
      {
        heading: "1. 适用范围",
        paragraphs: [
          "本政策适用于通过 linkola.cn 或您获得的编辑链接使用本服务的情形。",
          "招聘方通过「只读链接」查看时，页脚会简要说明本次访问会被匿名记录；招聘方无需阅读本政策全文。",
        ],
      },
      {
        heading: "2. 我们会处理哪些信息",
        bullets: [
          "您填写并发布的内容：姓名、岗位、经历、作品、联系方式，以及通过「上传本地文件」添加的图片、视频等。",
          "智能导入时上传的 PDF / Word：仅在服务器上临时解析，原始文件不长期保存。",
          "链接安全：系统会校验编辑链接是否有效；若您设置了编辑口令，口令经加密保存，工作人员无法查看原口令。",
          "招聘方打开只读链接时的访问记录：时间、设备类型、大致地区（不保存完整 IP 地址，不识别具体身份）。",
          "套餐与用量：订阅状态、试用期限、导入与 AI 解析次数等。",
        ],
      },
      {
        heading: "3. 信息如何用、谁会看到",
        bullets: [
          "在服务器保存并展示您发布的简历，供您编辑；招聘方持只读链接可查看，无法修改。",
          "智能导入用于生成可编辑初稿；若套餐含 AI 解析，提取的文字可能发送给第三方 AI 服务商处理。",
          "记录招聘方是否打开只读链接，供您本人在「链接访问记录」中查看。",
          "使用「发送到邮箱」时，由邮件服务商向收件人转发链接与正文。",
          "您分享出去的内容，对持有该只读链接的人可见；分享前请自行确认内容准确、收件人可信。",
          "我们不会向无关第三方出售您的个人信息。",
        ],
      },
      {
        heading: "4. 数据存在哪里、会保留多久",
        bullets: [
          "您发布的内容，以及通过「上传本地文件」添加的图片、视频等，保存在 linkola.cn 所在的服务器（中国大陆）。",
          "若您填写的是外链（如 B 站、图床、网盘链接），文件本身不在本服务器，我们只保存链接地址。",
          "智能导入的 PDF / Word 解析完成后即丢弃，不在服务器长期留存。",
          "未发布前的编辑草稿可能暂存在您当前使用的浏览器中；清除浏览器数据可能导致草稿丢失。",
          "账户有效期间，已发布内容与上传文件一般持续保留；套餐到期或停用后，编辑与对外访问可能暂停，具体以购买说明为准。",
          "访问记录有数量上限，较早的记录可能被新记录替代。",
        ],
      },
      {
        heading: "5. 可能涉及的第三方",
        bullets: [
          "AI 智能解析（若您的套餐包含）：简历文字可能发送至第三方 AI 服务商处理，受其隐私政策约束。",
          "邮件代发（若已启用）：「发送到邮箱」可能经第三方邮件服务转发，收件地址与内容由该服务商处理。",
          "地区识别：访问记录可能通过第三方服务获取大致城市/地区，仅用于统计是否被查看，不用于识别具体个人。",
        ],
      },
      {
        heading: "6. 您的权利与联系我们",
        bullets: [
          "您可在编辑器中修改已发布内容（需有效编辑链接与权限）。",
          "编辑口令由您自行设置；工作人员无法查看原口令，仅可在您授权下协助清除以便重设。",
          "访问记录仅编辑链接持有人可见。",
          "如需导出、删除数据或有其他疑问，请通过购买/客服渠道联系站点运营者。",
          "我们可能适时更新本政策；继续使用即视为接受更新后的版本。",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updatedAt: "June 26, 2026",
    intro:
      "This policy is for users who use their edit link to create, publish, and manage a resume. It explains how Linkola collects, uses, and protects your information. By using edit, publish, share, or smart import features, you acknowledge this policy.",
    sections: [
      {
        heading: "1. Scope",
        paragraphs: [
          "This policy applies when you use the service via linkola.cn or your personal edit link.",
          "Recruiters who open the read-only link only see a brief footer notice that the visit is logged anonymously—they do not need this full policy.",
        ],
      },
      {
        heading: "2. What we process",
        bullets: [
          "Content you publish: name, role, experience, portfolio, contacts, and files uploaded via “Upload local file”.",
          "PDF / Word for smart import: parsed temporarily on the server; source files are not kept long-term.",
          "Link security: we verify that your edit link is valid; if you set an edit PIN, it is stored encrypted—staff cannot see your original PIN.",
          "When a recruiter opens the read-only link: time, device type, approximate region (no full IP address, no personal identity).",
          "Plan & usage: subscription status, trial period, import and AI quotas.",
        ],
      },
      {
        heading: "3. How we use it & who can see it",
        bullets: [
          "We store and serve your published resume for editing; recruiters with the read-only link can view but not edit.",
          "Smart import creates an editable draft; AI plans may send extracted text to third-party AI providers.",
          "We log read-only link opens so you can check them under “View log”.",
          "“Send by email” may relay messages through a mail provider.",
          "Anyone with your read-only link can see shared content—review before sharing.",
          "We do not sell your personal data to unrelated third parties.",
        ],
      },
      {
        heading: "4. Where data lives & how long",
        bullets: [
          "Published content and files uploaded via “Upload local file” are stored on the linkola.cn server (mainland China).",
          "External links (e.g. video or image URLs) are not stored on our server—we only save the URL.",
          "Import source files are discarded after parsing.",
          "Unpublished drafts may sit in your browser; clearing browser data may remove them.",
          "Published data is generally kept while your account is active; access may pause after expiry per your plan.",
          "View log entries are capped; older entries may roll off.",
        ],
      },
      {
        heading: "5. Third parties",
        bullets: [
          "AI parsing (if included in your plan): resume text may be sent to third-party AI providers under their policies.",
          "Email relay (if enabled): “Send by email” may use a third-party mail service.",
          "Region lookup: approximate area for view logs only—not used to identify individuals.",
        ],
      },
      {
        heading: "6. Your rights & contact",
        bullets: [
          "You may edit published content with a valid edit link and permission.",
          "Edit PINs are set by you; staff cannot see your original PIN and may only clear it to let you set a new one.",
          "View logs are visible only to the edit link holder.",
          "For export, deletion, or questions, contact the operator via your purchase/support channel.",
          "We may update this policy; continued use means acceptance of the updated version.",
        ],
      },
    ],
  },
};

export function getPrivacyPolicy(lang: PrivacyPolicyLang): PrivacyPolicyContent {
  return PRIVACY_POLICY[lang];
}
