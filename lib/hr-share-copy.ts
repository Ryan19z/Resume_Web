/** ViewURL / HR 端「链接」弹窗文案（仅功能说明，不含隐私/语言配置） */

export type HrShareLang = "zh" | "en";

export const HR_SHARE_COPY: Record<
  HrShareLang,
  {
    title: string;
    subtitle: string;
    copyLink: string;
    copied: string;
    qr: string;
    close: string;
    qrTitle: string;
    qrSubtitle: string;
  }
> = {
  zh: {
    title: "复制链接",
    subtitle: "复制后转发给同事，或扫码在手机上打开同一页面。",
    copyLink: "复制链接",
    copied: "已复制",
    qr: "扫码打开",
    close: "关闭",
    qrTitle: "扫码打开",
    qrSubtitle: "用手机相机或微信扫一扫。",
  },
  en: {
    title: "Copy link",
    subtitle: "Copy to forward, or scan the QR code to open on mobile.",
    copyLink: "Copy link",
    copied: "Copied",
    qr: "Open with QR",
    close: "Close",
    qrTitle: "Open with QR",
    qrSubtitle: "Scan with your phone camera.",
  },
};

export function getHrShareCopy(lang: HrShareLang) {
  return HR_SHARE_COPY[lang];
}
