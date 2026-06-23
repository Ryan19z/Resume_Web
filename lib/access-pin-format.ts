/** 编辑口令格式（客户端与服务端共用，不含 crypto） */

export const ACCESS_PIN_MIN = 4;
export const ACCESS_PIN_MAX = 32;

/** 数字、英文字母、中文、连字符/下划线/点；不含空格与其他符号 */
export const ACCESS_PIN_PATTERN = /^[0-9A-Za-z\u4e00-\u9fff\-_.]+$/;

export function normalizeAccessPin(pin: string): string | null {
  const v = pin.trim();
  if (v.length < ACCESS_PIN_MIN || v.length > ACCESS_PIN_MAX) return null;
  if (!ACCESS_PIN_PATTERN.test(v)) return null;
  return v;
}

export const ACCESS_PIN_FORMAT_HINT = {
  zh: "4–32 位（支持数字、英文字母、中文及 -_. ；不含空格与其他符号）",
  en: "4–32 chars (digits, letters, Chinese, -_. ; no spaces or other symbols)",
} as const;

export const ACCESS_PIN_FORMAT_ERROR = {
  zh: "口令需 4–32 位，仅支持数字、英文字母、中文及 -_. ，且两次输入一致。",
  en: "PIN must be 4–32 chars using digits, letters, Chinese, or -_. , and both entries must match.",
} as const;
