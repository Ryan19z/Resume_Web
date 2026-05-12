/**
 * 进程内访客会话表（开发 / 单机 `next start` 有效；多实例或 Serverless 需换 Redis 等）。
 */
export type VisitorSessionRecord = {
  id: string;
  path: string;
  visibleMs: number;
  lastPing: number;
};

const sessions = new Map<string, VisitorSessionRecord>();
const MAX_SESSIONS = 80;

function prune(): void {
  while (sessions.size > MAX_SESSIONS) {
    let oldestId: string | null = null;
    let oldestT = Infinity;
    for (const [id, s] of sessions) {
      if (s.lastPing < oldestT) {
        oldestT = s.lastPing;
        oldestId = id;
      }
    }
    if (oldestId) sessions.delete(oldestId);
    else break;
  }
}

export function upsertVisitorSession(
  id: string,
  path: string,
  visibleMs: number,
): void {
  const now = Date.now();
  sessions.set(id, { id, path: path.slice(0, 256), visibleMs, lastPing: now });
  prune();
}

/** 最近 `maxStaleMs` 内仍有心跳的会话，按累计可见时长降序 */
export function listRecentVisitorSessions(maxStaleMs: number): VisitorSessionRecord[] {
  const now = Date.now();
  return [...sessions.values()]
    .filter((s) => now - s.lastPing <= maxStaleMs)
    .sort((a, b) => b.visibleMs - a.visibleMs);
}
