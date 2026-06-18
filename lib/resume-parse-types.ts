/** 简历解析中间结构（与 SiteContent 解耦，便于 LLM / 规则引擎输出） */

export type ParsedExperience = {
  title: string;
  company: string;
  period: string;
  summary?: string;
  keyResults: string[];
};

export type ParsedCampusHighlight = {
  role: string;
  period: string;
  bullets: string[];
};

export type ParsedEducation = {
  degree: string;
  school: string;
  period: string;
  summary?: string;
  /** 主修课程等文本亮点 */
  highlights: string[];
  /** 结构化在校经历（职务 + 描述要点） */
  campusExperiences?: ParsedCampusHighlight[];
};

export type ParsedProject = {
  title: string;
  description?: string;
  link?: string;
  period?: string;
  role?: string;
  bullets?: string[];
};

export type ParsedResume = {
  name?: string;
  targetRole?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactExtra?: string;
  heroPreviewLines?: string[];
  transferableSkills?: string[];
  experience: ParsedExperience[];
  education: ParsedEducation[];
  projects: ParsedProject[];
  /** 奖项荣誉（映射到核心亮点 / 教育亮点） */
  awards?: string[];
};

export type ResumeParseMethod = "llm" | "heuristic";

export type ResumeParseApiResponse =
  | {
      ok: true;
      method: ResumeParseMethod;
      parsed: ParsedResume;
      /** 成功映射的字段名，供 UI 展示 */
      fieldsFilled: string[];
      textLength: number;
      /** 字段完整度 0–1（按识别结果估算，非模型自报置信度） */
      confidence: number;
      /** 导入后建议人工核对的事项 */
      warnings?: string[];
    }
  | {
      ok: false;
      error: string;
      message: string;
    };
