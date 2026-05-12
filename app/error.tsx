"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-paper px-6 text-ink">
      <h1 className="text-lg font-semibold">页面暂时无法渲染</h1>
      <p className="max-w-md text-center text-sm leading-relaxed text-ink-muted">
        {process.env.NODE_ENV === "development"
          ? error.message
          : "请刷新重试；若通过隧道访问，请确认本机 Next 已启动且隧道指向正确端口。"}
      </p>
      {error.digest ? (
        <p className="text-[11px] text-ink-muted/80">digest: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink shadow-sm transition-colors hover:border-ink/15"
      >
        重试
      </button>
    </div>
  );
}
