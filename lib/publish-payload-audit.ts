import { MAX_PUBLISH_BYTES } from "@/lib/publish-limits";
import type { PersistedSiteBundle } from "@/lib/types";

const DATA_IMAGE_RE = /data:image\/[^"'\s\\]+/g;

export type PublishPayloadAuditResult = {
  jsonBytes: number;
  embeddedImageCount: number;
  embeddedImageChars: number;
  exceedsPublishLimit: boolean;
  hasEmbeddedImages: boolean;
  summaryZh: string;
  summaryEn: string;
};

export function auditPublishPayload(
  bundle: PersistedSiteBundle,
): PublishPayloadAuditResult {
  const json = JSON.stringify(bundle);
  const jsonBytes = new TextEncoder().encode(json).length;
  const matches = json.match(DATA_IMAGE_RE) ?? [];
  const embeddedImageCount = matches.length;
  const embeddedImageChars = matches.reduce((sum, m) => sum + m.length, 0);
  const exceedsPublishLimit = jsonBytes > MAX_PUBLISH_BYTES;
  const hasEmbeddedImages = embeddedImageCount > 0;

  const mb = (jsonBytes / 1024 / 1024).toFixed(1);
  const limitMb = Math.round(MAX_PUBLISH_BYTES / 1024 / 1024);

  let summaryZh = "";
  let summaryEn = "";

  if (hasEmbeddedImages) {
    const kb = (embeddedImageChars / 1024).toFixed(0);
    summaryZh = `检测到 ${embeddedImageCount} 处内嵌图片（Base64，约 ${kb}KB）。请用编辑区的「上传本地文件」转为服务器外链后再发布，可显著减小体积并避免超限。`;
    summaryEn = `${embeddedImageCount} embedded image(s) (~${kb}KB). Use "Upload local file" in the editor to get hosted URLs before publishing.`;
  }

  if (exceedsPublishLimit) {
    const extraZh = `当前发布包约 ${mb}MB，超过 ${limitMb}MB 上限，服务器将拒绝保存。`;
    const extraEn = `Payload ~${mb}MB exceeds the ${limitMb}MB publish limit.`;
    summaryZh = summaryZh ? `${summaryZh} ${extraZh}` : extraZh;
    summaryEn = summaryEn ? `${summaryEn} ${extraEn}` : extraEn;
  }

  return {
    jsonBytes,
    embeddedImageCount,
    embeddedImageChars,
    exceedsPublishLimit,
    hasEmbeddedImages,
    summaryZh,
    summaryEn,
  };
}

export function shouldShowAssetHint(audit: PublishPayloadAuditResult): boolean {
  return audit.hasEmbeddedImages || audit.exceedsPublishLimit;
}
