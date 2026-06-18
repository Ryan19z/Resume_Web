import { clientIpFromHeaders } from "@/lib/server/edit-auth";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 8000;

function pruneBuckets(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size > MAX_BUCKETS) {
    const first = buckets.keys().next().value;
    if (first) buckets.delete(first);
    else break;
  }
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/** 进程内滑动窗口限流（单机 PM2 场景适用） */
export function checkRateLimit(
  headers: Headers,
  routeKey: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const ip = clientIpFromHeaders(headers) || "unknown";
  const key = `${routeKey}:${ip}`;
  const now = Date.now();
  pruneBuckets(now);

  const cur = buckets.get(key);
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (cur.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)),
    };
  }
  cur.count += 1;
  return { ok: true };
}

export function rateLimitResponse(retryAfterSec: number) {
  return {
    ok: false as const,
    error: "rate_limited" as const,
    message: `请求过于频繁，请 ${retryAfterSec} 秒后再试。`,
    retryAfterSec,
  };
}
