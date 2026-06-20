import {
  appendResumeScopeToPath,
  parseClientResumeScope,
  type ResumeScope,
} from "@/lib/resume-scope";

export type SiteTourStatus = {
  shouldAutoPlay: boolean;
};

export async function fetchSiteTourStatus(
  scope: ResumeScope = parseClientResumeScope(),
): Promise<SiteTourStatus> {
  const path = appendResumeScopeToPath("/api/site-tour", scope, {
    includeEditToken: true,
    includeViewToken: true,
  });
  const r = await fetch(path, { cache: "no-store" });
  const data = (await r.json().catch(() => ({}))) as {
    ok?: boolean;
    shouldAutoPlay?: boolean;
  };
  if (!r.ok || !data.ok) {
    throw new Error("site_tour_status_failed");
  }
  return { shouldAutoPlay: Boolean(data.shouldAutoPlay) };
}

export async function markSiteTourSeenOnServer(
  scope: ResumeScope = parseClientResumeScope(),
): Promise<void> {
  const path = appendResumeScopeToPath("/api/site-tour", scope, {
    includeEditToken: true,
    includeViewToken: true,
  });
  await fetch(path, { method: "POST", cache: "no-store" });
}
