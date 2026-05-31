import type { EducationItem } from "./types";
import { randomId } from "./random-id";

export function newEducationItem(): EducationItem {
  return {
    id: randomId("edu-"),
    title: "学历 / 专业",
    subtitle: "学校名称",
    period: "起止时间",
    summary: "",
    campusHighlights: [
      {
        heading: "校园成果分组",
        bullets: ["示例要点 1", "示例要点 2"],
      },
    ],
    representativeProjects: [],
  };
}

