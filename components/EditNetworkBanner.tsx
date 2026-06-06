"use client";

import { useSiteContent } from "@/context/SiteContentProvider";
import { parseClientResumeScope } from "@/lib/resume-scope";

export function EditNetworkBanner() {
  const { canEdit, editPermissionLoaded, editPermissionHint } = useSiteContent();
  const scope = parseClientResumeScope();

  /** HR 只读链接（ViewURL）：仅有 viewToken、无 editToken，不展示编辑权限技术提示 */
  if (scope.viewToken && !scope.editToken) return null;

  if (!editPermissionLoaded || canEdit) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-[3.65rem] z-[64] flex justify-center px-4 pt-1 print:hidden sm:top-14">
      <p className="max-w-lg rounded-full border border-line bg-surface/90 px-4 py-2 text-center text-[11px] leading-snug text-ink-muted shadow-sm backdrop-blur-md">
        只读浏览：当前访问 IP 未在服务端白名单内，已隐藏所有编辑入口。
        {editPermissionHint ? `（${editPermissionHint}）` : ""}
      </p>
    </div>
  );
}
