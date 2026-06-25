/** HR / ViewURL 只读端查看说明 */

export type HrViewGuideLang = "zh" | "en";

export type HrViewGuideStep = {
  title: string;
  body: string;
};

export type HrViewGuideContent = {
  title: string;
  subtitle: string;
  steps: HrViewGuideStep[];
  footerNote: string;
  closeLabel: string;
  gotItLabel: string;
  openButtonLabel: string;
};

export const HR_VIEW_GUIDE: Record<HrViewGuideLang, HrViewGuideContent> = {
  zh: {
    title: "HR 查看说明",
    subtitle: "第一次打开候选人链接？按下面几步浏览即可，无需注册或登录。",
    steps: [
      {
        title: "1. 认页面分区",
        body: "顶部导航「首页 / 履历 / 作品」可点击跳转；右上角「链接」可复制本页地址转发同事。",
      },
      {
        title: "2. 先看 HR 速览",
        body: "导航下方速览条汇总姓名、意向岗位与核心亮点；邮箱、电话可点击联系，「完整联系方式」跳回首屏。",
      },
      {
        title: "3. 查看履历详情",
        body: "进入「履历」区浏览工作/项目经历与教育背景。点击卡片可展开详情；经历下的「代表项目」可能含图片、视频、代码或文档链接。",
      },
      {
        title: "4. 查看作品案例",
        body: "「作品」区展示候选人精选案例。点击卡片通常可打开外部链接（仓库、演示页、视频等）。",
      },
      {
        title: "5. 语言与设备",
        body: "语言版本由候选人分享链接时设定；若未锁定，右上角可能出现 EN / 中文。需要另一语言版本请联系候选人。手机与电脑均可直接打开。",
      },
      {
        title: "6. 隐私提示",
        body: "页脚会匿名记录本次是否打开及大致地区，帮助候选人确认简历已送达；不保存完整 IP 地址，也无法识别您的具体身份。记录仅供候选人确认查看情况。",
      },
    ],
    footerNote: "本页为只读浏览，您无法编辑内容。如有疑问请联系发送链接的候选人。",
    closeLabel: "关闭",
    gotItLabel: "知道了，开始查看",
    openButtonLabel: "查看说明",
  },
  en: {
    title: "Guide for HR",
    subtitle: "First time opening a candidate link? Follow these steps—no sign-up required.",
    steps: [
      {
        title: "1. Page sections",
        body: "Use Home / Resume / Work in the top nav; tap Link top-right to copy this page for colleagues.",
      },
      {
        title: "2. Quick summary",
        body: "Below the nav, the summary bar shows name, target role, and highlights. Tap email or phone to contact; “Full contact” jumps to the hero section.",
      },
      {
        title: "3. Resume details",
        body: "Open Resume for experience and education. Tap cards to expand; representative projects may include images, videos, code, or documents.",
      },
      {
        title: "4. Portfolio",
        body: "The Work section lists selected cases. Cards often open external links (repos, demos, videos).",
      },
      {
        title: "5. Language & device",
        body: "Language was set when the candidate shared the link. If not locked, EN / 中文 may appear top-right. Contact the candidate for another language version.",
      },
      {
        title: "6. Privacy note",
        body: "The footer logs that this page was opened and approximate region so the candidate knows it was seen—no full IP address or personal identity. Logs are for the candidate's confirmation only.",
      },
    ],
    footerNote: "This page is read-only. Contact the candidate who shared the link if you have questions.",
    closeLabel: "Close",
    gotItLabel: "Got it, start viewing",
    openButtonLabel: "How to view",
  },
};

export function getHrViewGuide(lang: HrViewGuideLang): HrViewGuideContent {
  return HR_VIEW_GUIDE[lang];
}
