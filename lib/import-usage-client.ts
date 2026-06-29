import { appendResumeScopeToPath, parseClientResumeScope } from "@/lib/resume-scope";

export async function recordImportUsageOnApply(aiUsed: boolean): Promise<boolean> {
  const scope = parseClientResumeScope();
  if (!scope.resumeId) return true;

  const url = appendResumeScopeToPath("/api/import-usage", scope, {
    includeEditToken: true,
    includeViewToken: false,
  });

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiUsed }),
    });
    const data = (await resp.json().catch(() => ({}))) as { ok?: boolean };
    return resp.ok && data.ok === true;
  } catch {
    return false;
  }
}
