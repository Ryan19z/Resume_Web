export type ResolvedVideoPreview =
  | { mode: "direct"; src: string }
  | { mode: "embed"; src: string }
  | { mode: "unknown"; src: string };

function extractYouTubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (host === "youtu.be") return pathParts[0] ?? null;
  if (!host.includes("youtube.com")) return null;
  if (url.pathname.startsWith("/watch")) return url.searchParams.get("v");
  if (url.pathname.startsWith("/shorts/")) return pathParts[1] ?? null;
  if (url.pathname.startsWith("/embed/")) return pathParts[1] ?? null;
  return null;
}

export function resolveVideoPreview(urlText: string): ResolvedVideoPreview {
  const src = urlText.trim();
  if (!src) return { mode: "unknown", src: "" };
  if (/\.(mp4|webm|ogg|mov|m3u8)(\?.*)?$/i.test(src)) {
    return { mode: "direct", src };
  }
  try {
    const url = new URL(src);
    const host = url.hostname.toLowerCase();

    const youtubeId = extractYouTubeId(url);
    if (youtubeId) {
      return { mode: "embed", src: `https://www.youtube.com/embed/${youtubeId}` };
    }

    if (host.includes("bilibili.com")) {
      const pathName = url.pathname;
      const bvMatch = pathName.match(/\/video\/(BV[0-9A-Za-z]+)/i);
      if (bvMatch) {
        return {
          mode: "embed",
          src: `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&page=1`,
        };
      }
      const avMatch = pathName.match(/\/video\/av(\d+)/i);
      if (avMatch) {
        return {
          mode: "embed",
          src: `https://player.bilibili.com/player.html?aid=${avMatch[1]}&page=1`,
        };
      }
      if (host.includes("player.bilibili.com")) {
        return { mode: "embed", src };
      }
    }
  } catch {
    // ignore invalid URL
  }
  return { mode: "unknown", src };
}
