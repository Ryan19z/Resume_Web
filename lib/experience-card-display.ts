import type { AchievementBlock, ExperienceItem } from "@/lib/types";

const DEFAULT_CARD_KEY_RESULT_COUNT = 3;

export function getExperienceCardKeyResults(
  item: ExperienceItem,
  hrSpreadMode: boolean,
): string[] {
  const lines = (item.keyResults ?? [])
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  if (hrSpreadMode) return lines;
  return lines.slice(0, DEFAULT_CARD_KEY_RESULT_COUNT);
}

export function experienceCardHasMoreKeyResults(item: ExperienceItem): boolean {
  const total = (item.keyResults ?? [])
    .map((x) => String(x ?? "").trim())
    .filter(Boolean).length;
  return total > DEFAULT_CARD_KEY_RESULT_COUNT;
}

export function flattenAchievementBullets(blocks: AchievementBlock[]): string[] {
  return (blocks ?? []).flatMap((block) =>
    (block.bullets ?? [])
      .map((line) => String(line ?? "").trim())
      .filter(Boolean),
  );
}

export function getEducationCardBullets(
  blocks: AchievementBlock[],
  hrSpreadMode: boolean,
): string[] {
  const lines = flattenAchievementBullets(blocks);
  if (hrSpreadMode) return lines;
  return lines.slice(0, DEFAULT_CARD_KEY_RESULT_COUNT);
}

export function educationCardHasMoreBullets(blocks: AchievementBlock[]): boolean {
  return flattenAchievementBullets(blocks).length > DEFAULT_CARD_KEY_RESULT_COUNT;
}
