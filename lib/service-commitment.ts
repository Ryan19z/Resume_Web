/** 对外服务承诺边界（智能导入 + 在线简历托管） */

export type ServiceCommitmentLang = "zh" | "en";

export const SERVICE_COMMITMENT = {
  zh: {
    title: "服务承诺说明",
    subtitle: "购买或续费前请知悉以下边界，避免预期落差。",
    weProvide: {
      heading: "我们提供什么",
      items: [
        "独立 EditURL / ViewURL，HR 可在手机与电脑打开只读页面。",
        "编辑后自动发布到服务器，访客看到最新内容。",
        "HR 打开 ViewURL 时的匿名访问记录（不含明文 IP）。",
        "智能导入：从 PDF / Word / 文本快速生成初稿，减少手工录入时间。",
        "导入预览页的质量评分与核对清单，帮助你在填入前判断可能要改的地方。",
      ],
    },
    weDoNot: {
      heading: "我们不承诺什么",
      items: [
        "智能导入不能 100% 还原任意排版简历；复杂表格、扫描件、多栏 Word 可能需要人工调整。",
        "不保证「零编辑即可投递」；导入后仍需在预览核对清单中确认姓名、经历条数、奖项是否一条一项。",
        "不替您保证 HR 一定打开链接或给出反馈（仅记录是否被打开及大致地区）。",
        "扫描版 PDF 若无 OCR，可能无法提取文字，需换文字版或手动填写。",
      ],
    },
    importNote:
      "智能导入的定位是「快速铺底 + 人工核对」，不是全自动完美转换。预览页评分低于建议线时，仍可填入，但请务必按清单逐项检查。",
    billingNote:
      "月租/续费用于覆盖服务器、域名与 AI 解析等持续成本；到期后编辑或对外访问可能暂停，具体以购买说明为准。",
  },
  en: {
    title: "Service commitment",
    subtitle: "Please read before purchase or renewal.",
    weProvide: {
      heading: "What we provide",
      items: [
        "Dedicated Edit / View URLs; HR can open a read-only page on mobile and desktop.",
        "Publish to server after edits so visitors see the latest content.",
        "Anonymous view logs when HR opens the View URL (no raw IP stored).",
        "Smart import: draft from PDF / Word / text to save manual entry time.",
        "Quality score and checklist on the import preview before you apply.",
      ],
    },
    weDoNot: {
      heading: "What we do not guarantee",
      items: [
        "Smart import cannot perfectly reproduce every resume layout; complex tables, scans, or multi-column Word may need manual fixes.",
        "Not “zero-edit ready to send”; review name, section counts, and awards after import.",
        "We do not guarantee HR will open the link or respond (we only log opens and approximate region).",
        "Scanned PDFs without OCR may fail text extraction; use a text-based file or fill manually.",
      ],
    },
    importNote:
      "Smart import means fast draft + human review, not perfect automation. If the preview score is low, you may still apply—but follow the checklist.",
    billingNote:
      "Subscription covers hosting, domain, and AI usage; editing or public access may pause after expiry per your plan terms.",
  },
} as const;

export function getServiceCommitment(lang: ServiceCommitmentLang) {
  return SERVICE_COMMITMENT[lang];
}

/** 导入弹窗内展示的精简版 */
export function getImportCommitmentBrief(lang: ServiceCommitmentLang): string {
  return lang === "zh"
    ? "智能导入用于快速生成初稿，复杂排版需人工核对；填入前请查看下方质量评分与核对清单。"
    : "Smart import creates a draft; complex layouts need manual review. Check the score and checklist before applying.";
}
