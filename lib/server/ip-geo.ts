const LOOPBACK =
  /^(127\.|::1$|localhost$)|^0:0:0:0:0:0:0:1$/i;

export function isLoopbackIp(ip: string): boolean {
  const v = ip.trim();
  if (!v) return true;
  return (
    v === "127.0.0.1" ||
    v === "::1" ||
    v === "localhost" ||
    v.startsWith("127.") ||
    LOOPBACK.test(v)
  );
}

export type IpGeoHint = {
  city?: string;
  region?: string;
  country?: string;
};

/** 根据 IP 解析大致城市（失败时返回空，不抛错） */
export async function lookupIpGeo(ip: string): Promise<IpGeoHint> {
  if (!ip || isLoopbackIp(ip)) {
    return { city: "本地", region: undefined, country: undefined };
  }
  try {
    const url = `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city&lang=zh-CN`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return {};
    const j = (await res.json()) as {
      status?: string;
      country?: string;
      regionName?: string;
      city?: string;
    };
    if (j.status !== "success") return {};
    return {
      city: j.city?.trim() || undefined,
      region: j.regionName?.trim() || undefined,
      country: j.country?.trim() || undefined,
    };
  } catch {
    return {};
  }
}

export function formatGeoLabel(geo: IpGeoHint): string {
  const parts = [geo.city, geo.region, geo.country].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}
