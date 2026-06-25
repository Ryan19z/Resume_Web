import { parseClientResumeScope } from "@/lib/resume-scope";

export const ACCESS_GATE_VERIFIED_EVENT = "access-gate-verified";
export const ACCESS_PIN_CONFIG_CHANGED_EVENT = "access-pin-config-changed";

export function notifyAccessGateVerified(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ACCESS_GATE_VERIFIED_EVENT));
}

export function notifyAccessPinConfigChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ACCESS_PIN_CONFIG_CHANGED_EVENT));
}

export async function verifyEditAccessPin(
  pin: string,
): Promise<{ ok: boolean; message?: string }> {
  const scope = parseClientResumeScope();
  if (!scope.resumeId || !scope.editToken) {
    return { ok: false, message: "请使用完整编辑链接打开后再验证口令。" };
  }
  const trimmed = pin.trim();
  if (!trimmed) {
    return { ok: false, message: "请输入口令。" };
  }
  try {
    const r = await fetch("/api/access-gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeId: scope.resumeId,
        pin: trimmed,
        editToken: scope.editToken,
        viewToken: scope.viewToken,
      }),
    });
    const d = (await r.json()) as { ok?: boolean; message?: string };
    if (!r.ok || !d.ok) {
      return { ok: false, message: d.message ?? "口令错误，请重试。" };
    }
    notifyAccessGateVerified();
    return { ok: true, message: d.message ?? "验证成功。" };
  } catch {
    return { ok: false, message: "验证失败，请检查网络后重试。" };
  }
}

export function isAccessPinErrorMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  return /口令|PIN/i.test(message);
}
