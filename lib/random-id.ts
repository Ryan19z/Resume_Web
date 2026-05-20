/** 生成带前缀的唯一 id；非 HTTPS 等环境下 crypto.randomUUID 可能不可用 */
export function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}${crypto.randomUUID()}`;
  }
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
