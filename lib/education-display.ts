import type { EducationItem } from "./types";

/** 从「某某大学专业名」合并字符串中拆分学校与专业 */
export function splitSchoolMajorBlob(
  blob: string,
): { school: string; major: string } | null {
  const trimmed = blob.trim();
  if (!trimmed) return null;

  const match = trimmed.match(
    /^([\u4e00-\u9fffA-Za-z0-9（）()·\-\s]+(?:大学|学院|University|College))(.+)$/i,
  );
  if (!match?.[1] || !match[2]?.trim()) return null;

  return { school: match[1].trim(), major: match[2].trim() };
}

const DEGREE_LEVEL_ONLY = /^(?:本科|硕士|博士|专科|学士)$/;

/** 规范化展示用的学校名与专业/学历行 */
export function resolveEducationDisplay(item: EducationItem): {
  school: string;
  major: string;
} {
  let school = item.subtitle.trim();
  let major = item.title.trim();

  const mergedInSubtitle = splitSchoolMajorBlob(school);
  if (mergedInSubtitle && (DEGREE_LEVEL_ONLY.test(major) || !major)) {
    school = mergedInSubtitle.school;
    major = mergedInSubtitle.major;
  }

  const mergedInTitle = splitSchoolMajorBlob(major);
  if (mergedInTitle && DEGREE_LEVEL_ONLY.test(school)) {
    school = mergedInTitle.school;
    major = mergedInTitle.major;
  }

  if (school && major && school.includes(major) && major.length >= 2) {
    const split = splitSchoolMajorBlob(school);
    if (split) {
      school = split.school;
      major = split.major;
    }
  }

  return {
    school: school || "学校",
    major: major || "专业",
  };
}
