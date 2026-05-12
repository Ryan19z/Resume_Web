import type { ExperienceItem } from "./types";
import { newRepresentativeProject } from "./rep-project";

export function newExperienceItem(): ExperienceItem {
  return {
    id: `exp-${crypto.randomUUID()}`,
    title: "职位名称",
    subtitle: "公司 / 团队",
    period: "起止时间",
    summary: "用一两句话概括这段经历。",
    keyResults: ["关键成果要点一", "关键成果要点二"],
    representativeProjects: [newRepresentativeProject()],
  };
}
