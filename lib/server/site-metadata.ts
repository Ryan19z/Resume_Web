import { mergeInitialSite } from "@/lib/persist-site";

import { readPublishedSite } from "@/lib/server/published-site-store";

import type { Metadata } from "next";



type SiteLang = "zh" | "en";



function buildMetadataFromSite(

  site: ReturnType<typeof mergeInitialSite>,

  lang: SiteLang,

): Pick<Metadata, "title" | "description" | "keywords"> {

  const name = site.name?.trim() || (lang === "zh" ? "在线简历" : "Resume");

  const role = site.targetRole?.trim();

  const tagline = site.tagline?.trim();

  const title = role ? `${name} · ${role}` : name;

  const description =

    tagline ||

    site.heroPreviewLines?.find((l) => l.trim()) ||

    (lang === "zh"

      ? `${name} 的在线简历与作品集`

      : `${name}'s online resume and portfolio`);



  const keywords = [

    name,

    role,

    ...(site.transferableSkills ?? []).slice(0, 8),

    lang === "zh" ? "在线简历" : "resume",

    lang === "zh" ? "作品集" : "portfolio",

  ].filter((k): k is string => Boolean(k?.trim()));



  return { title, description, keywords };

}



export async function buildPageMetadata(lang: SiteLang = "zh"): Promise<Metadata> {

  const fallback: Metadata = {

    title: lang === "zh" ? "在线简历" : "Online Resume",

    description:

      lang === "zh"

        ? "个人在线简历与作品集"

        : "Personal online resume and portfolio",

    alternates: {

      languages: {

        "zh-CN": "/",

        en: "/?lang=en",

      },

    },

  };



  try {

    const [zhResult, enResult] = await Promise.all([

      readPublishedSite("zh"),

      readPublishedSite("en"),

    ]);



    const primary =

      lang === "en" && enResult.status === "ok"

        ? enResult

        : zhResult.status === "ok"

          ? zhResult

          : enResult.status === "ok"

            ? enResult

            : null;



    if (!primary || primary.status !== "ok") return fallback;



    const site = mergeInitialSite(primary.bundle);

    const meta = buildMetadataFromSite(site, lang);



    const enMeta =

      enResult.status === "ok"

        ? buildMetadataFromSite(mergeInitialSite(enResult.bundle), "en")

        : null;



    return {

      ...meta,

      openGraph: {

        title: meta.title as string,

        description: meta.description as string,

        type: "website",

        locale: lang === "zh" ? "zh_CN" : "en_US",

        alternateLocale: lang === "zh" ? "en_US" : "zh_CN",

      },

      twitter: {

        card: "summary",

        title: meta.title as string,

        description: meta.description as string,

      },

      alternates: {

        languages: {

          "zh-CN": "/",

          en: "/?lang=en",

        },

      },

      robots: {

        index: true,

        follow: true,

      },

      ...(enMeta && lang === "zh"

        ? {

            other: {

              "og:locale:alternate": "en_US",

              "resume:name:en": String(enMeta.title ?? ""),

            },

          }

        : {}),

    };

  } catch {

    return fallback;

  }

}



/** 供 layout / 多语言切换参考的英文 metadata（客户端 SEO 有限，主要服务爬虫） */

export async function buildEnglishPageMetadata(): Promise<Metadata> {

  return buildPageMetadata("en");

}

