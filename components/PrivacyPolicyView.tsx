"use client";

import { getPrivacyPolicy, type PrivacyPolicyLang } from "@/lib/privacy-policy-content";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function resolveLang(raw: string | null): PrivacyPolicyLang {
  return raw === "en" ? "en" : "zh";
}

export function PrivacyPolicyView() {
  const searchParams = useSearchParams();
  const lang = resolveLang(searchParams.get("lang"));
  const policy = getPrivacyPolicy(lang);
  const otherLang: PrivacyPolicyLang = lang === "zh" ? "en" : "zh";

  return (
    <article className="mx-auto max-w-3xl px-6 py-10 sm:px-10 sm:py-14">
      <header className="border-b border-line/70 pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
          Linkola · {lang === "zh" ? "在线简历" : "Resume hosting"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {policy.title}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {lang === "zh" ? "最后更新：" : "Last updated: "}
          {policy.updatedAt}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/"
            className="rounded-full border border-line bg-surface/80 px-3 py-1.5 text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
          >
            {lang === "zh" ? "返回首页" : "Back home"}
          </Link>
          <Link
            href={`/privacy?lang=${otherLang}`}
            className="rounded-full border border-line bg-surface/80 px-3 py-1.5 text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
          >
            {otherLang === "zh" ? "中文版" : "English"}
          </Link>
        </div>
      </header>

      <p className="mt-8 text-sm leading-relaxed text-ink-muted">{policy.intro}</p>

      <div className="mt-8 space-y-8">
        {policy.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-base font-semibold text-ink">{section.heading}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className="mt-3 text-sm leading-relaxed text-ink-muted">
                {p}
              </p>
            ))}
            {section.bullets ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-muted">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}
