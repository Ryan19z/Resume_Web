export type ResumeScope = {
  resumeId?: string;
  editToken?: string;
  viewToken?: string;
};

const ID_RE = /^[A-Za-z0-9_-]{6,64}$/;
const TOKEN_RE = /^[^\s]{6,256}$/;

export function sanitizeResumeId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return ID_RE.test(v) ? v : undefined;
}

export function sanitizeResumeToken(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return TOKEN_RE.test(v) ? v : undefined;
}

export function parseResumeScopeFromSearchParams(
  searchParams: URLSearchParams,
): ResumeScope {
  return {
    resumeId: sanitizeResumeId(searchParams.get("resumeId")),
    editToken: sanitizeResumeToken(searchParams.get("editToken")),
    viewToken: sanitizeResumeToken(searchParams.get("viewToken")),
  };
}

export function parseClientResumeScope(): ResumeScope {
  if (typeof window === "undefined") return {};
  return parseResumeScopeFromSearchParams(new URLSearchParams(window.location.search));
}

export function appendResumeScopeToPath(
  path: string,
  scope: ResumeScope,
  opts?: { includeEditToken?: boolean; includeViewToken?: boolean },
): string {
  const includeEditToken = opts?.includeEditToken ?? true;
  const includeViewToken = opts?.includeViewToken ?? true;
  const url = new URL(path, "http://local");
  if (scope.resumeId) url.searchParams.set("resumeId", scope.resumeId);
  if (includeEditToken && scope.editToken) {
    url.searchParams.set("editToken", scope.editToken);
  }
  if (includeViewToken && scope.viewToken) {
    url.searchParams.set("viewToken", scope.viewToken);
  }
  return `${url.pathname}${url.search}`;
}

