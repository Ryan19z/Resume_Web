export type VideoPlaybackSnapshot = {
  currentTime: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  shouldPlay: boolean;
};

export function readVideoSnapshot(video: HTMLVideoElement): VideoPlaybackSnapshot {
  return {
    currentTime: video.currentTime || 0,
    volume: video.volume,
    muted: video.muted,
    playbackRate: video.playbackRate || 1,
    shouldPlay: !video.paused && !video.ended,
  };
}

/** 将快照应用到 video 元素；若 metadata 未就绪则监听 loadedmetadata */
export function applyVideoSnapshot(
  video: HTMLVideoElement,
  snap: VideoPlaybackSnapshot,
): (() => void) | undefined {
  const applyState = () => {
    try {
      video.currentTime = Math.max(0, snap.currentTime);
    } catch {
      // ignore seek failure on unsupported stream
    }
    video.volume = snap.volume;
    video.muted = snap.muted;
    video.playbackRate = snap.playbackRate || 1;
    if (snap.shouldPlay) {
      void video.play().catch(() => {
        // ignore autoplay rejection
      });
    } else {
      video.pause();
    }
  };

  if (video.readyState >= 1) {
    applyState();
    return undefined;
  }
  const onLoaded = () => {
    video.removeEventListener("loadedmetadata", onLoaded);
    applyState();
  };
  video.addEventListener("loadedmetadata", onLoaded);
  return () => video.removeEventListener("loadedmetadata", onLoaded);
}
