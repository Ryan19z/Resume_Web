import type { PersistedSiteBundle } from "@/lib/types";
type SiteLang = "zh" | "en";

export type FetchPublishedResult =
  | { status: "empty" }
  | { status: "ok"; bundle: PersistedSiteBundle; updatedAt: number }
  | {
      status: "error";
      code: "read_failed" | "corrupt";
      message: string;
    };

type SiteGetResponse = {
  ok?: boolean;
  published?: boolean;
  bundle?: PersistedSiteBundle | null;
  updatedAt?: number | null;
  error?: string;
  message?: string;
};

type SitePutResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
};

/** 读取服务器已发布快照（所有访客应优先使用） */
export async function fetchPublishedSite(
  lang: SiteLang = "zh",
): Promise<FetchPublishedResult> {
  if (typeof window === "undefined") return { status: "empty" };
  try {
    const r = await fetch(`/api/site?lang=${lang}`, { cache: "no-store" });
    const data = (await r.json().catch(() => ({}))) as SiteGetResponse;
    if (!r.ok || data.ok === false) {
      const code =
        data.error === "corrupt" ? "corrupt" : ("read_failed" as const);
      return {
        status: "error",
        code,
        message:
          typeof data.message === "string"
            ? data.message
            : "读取服务器发布数据失败。",
      };
    }
    if (data.published && data.bundle) {
      const updatedAt =
        typeof data.updatedAt === "number" && Number.isFinite(data.updatedAt)
          ? data.updatedAt
          : (data.bundle.savedAt ?? 0);
      return { status: "ok", bundle: data.bundle, updatedAt };
    }
    return { status: "empty" };
  } catch {
    return {
      status: "error",
      code: "read_failed",
      message: "无法连接服务器发布接口，请检查网络或 Nginx 配置。",
    };
  }
}

/** @deprecated 使用 fetchPublishedSite */
export async function fetchPublishedBundle(): Promise<PersistedSiteBundle | null> {
  const r = await fetchPublishedSite("zh");
  return r.status === "ok" ? r.bundle : null;
}

/** 将快照发布到服务器（需 IP 白名单编辑权限） */
export async function publishBundleToServer(
  bundle: PersistedSiteBundle,
  lang: SiteLang = "zh",
): Promise<{ ok: boolean; message?: string }> {
  if (typeof window === "undefined") return { ok: false, message: "非浏览器环境" };
  try {
    const r = await fetch(`/api/site?lang=${lang}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundle),
    });
    const data = (await r.json().catch(() => ({}))) as SitePutResponse;
    if (r.ok && data.ok) return { ok: true };
    return {
      ok: false,
      message:
        typeof data.message === "string"
          ? data.message
          : "发布到服务器失败，访客可能仍看到旧版本。",
    };
  } catch {
    return {
      ok: false,
      message: "无法连接服务器发布接口，请检查网络或 Nginx 配置。",
    };
  }
}
