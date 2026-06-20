import type { ParsedResume } from "@/lib/resume-parse-types";
import { computeParseConfidence } from "@/lib/server/resume-parse-reconcile";

const PARSE_SCHEMA = `{
  "name": "string | null",
  "targetRole": "string | null",
  "tagline": "string | null — 一句话自我介绍，80字以内",
  "contactEmail": "string | null",
  "contactPhone": "string | null",
  "contactExtra": "string | null — 微信等其他联系方式",
  "heroPreviewLines": ["string"] — 2-6条核心亮点/量化成果,
  "transferableSkills": ["string"] — 技能标签,
  "experience": [{
    "title": "职位 — 仅填写实习/校招/社招等『工作岗位』，不要放学生会/班委/社团/竞赛角色",
    "company": "公司 — 实习/正式工作的公司或团队名称",
    "period": "起止时间 — 如 2023.07-2023.09",
    "summary": "string | null — 该工作的整体概述",
    "keyResults": ["关键成果 bullet — 每条为一句话，描述职责或量化成果（只针对工作，不包含校园职务/课题）"]
  }],
  "education": [{
    "degree": "学历/专业 — 如 电子信息工程（本科）",
    "school": "学校 — 如 XX 大学/学院",
    "period": "起止时间 — 如 2020.09-2024.06",
    "summary": "string | null — 教育背景概述",
    "highlights": ["校园亮点 bullet — 奖学金/成绩/竞赛获奖等非具体项目"],
    "campusExperiences": [{
      "role": "string — 校园角色/职务，如 班级心理委员、学生会主席、校新闻中心成员、智能车队队员",
      "period": "string — 任职时间",
      "bullets": ["string — 校园经历的具体工作内容或成果 bullet"]
    }]
  }],
  "projects": [{
    "title": "项目名 — 课程设计/竞赛项目/科研项目等（含芯片型号或系统名，如 惯导定位越野车（TC264））",
    "description": "string | null — 项目的整体介绍（场景+目标，一段话）",
    "role": "string | null — 在项目中的角色，如 负责人/主要开发/队员",
    "period": "string | null — 项目起止时间",
    "bullets": ["项目要点 bullet — 同一项目的所有技术方案/职责/量化成果都放这里，每条一句，不要拆成多个 project"],
    "link": "string | null — 项目链接/仓库地址，如无可为 null"
  }],
  "awards": ["string"] — 奖学金、学科/英语/竞赛获奖、校级及以上荣誉（含年份），不要放进 projects
}`;

function resolveLlmConfig(): {
  apiKey: string;
  baseUrl: string;
  model: string;
} | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = (
    process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model =
    process.env.RESUME_PARSE_MODEL?.trim() || "gpt-4o-mini";
  return { apiKey, baseUrl, model };
}

function sanitizeParsed(raw: unknown): ParsedResume | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;

  const normalizeListText = (text: string): string[] =>
    text
      .split(/\r?\n|[；;。]+/g)
      .map((x) => x.replace(/^[•·\-*]+\s*/, "").trim())
      .filter(Boolean);

  const strList = (v: unknown, max = 12): string[] => {
    const list = Array.isArray(v)
      ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
      : typeof v === "string"
        ? normalizeListText(v)
        : [];
    return list.slice(0, max);
  };
  const maybeArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const asRecord = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : null;

  const experience = Array.isArray(o.experience)
    ? o.experience
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const e = item as Record<string, unknown>;
          const title = str(e.title) ?? "";
          const company = str(e.company) ?? "";
          const period = str(e.period) ?? "";
          if (!title && !company) return null;
          return {
            title,
            company,
            period,
            summary: str(e.summary),
            keyResults: strList(e.keyResults, 8),
          };
        })
        .filter(Boolean)
    : [];

  const education = Array.isArray(o.education)
    ? o.education
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const e = item as Record<string, unknown>;
          const school = str(e.school) ?? "";
          const degree = str(e.degree) ?? "";
          const period = str(e.period) ?? "";
          if (!school && !degree) return null;
          return {
            school,
            degree,
            period,
            summary: str(e.summary),
            highlights: strList(e.highlights, 8),
            campusExperiences: maybeArray(e.campusExperiences)
              .map((c) => {
                const rec = asRecord(c);
                if (!rec) return null;
                const role = str(rec.role);
                if (!role) return null;
                return {
                  role,
                  period: str(rec.period) ?? "",
                  bullets: strList(rec.bullets, 12),
                };
              })
              .filter(Boolean) as NonNullable<
              ParsedResume["education"][number]["campusExperiences"]
            >,
          };
        })
        .filter(Boolean)
    : [];

  const projects = Array.isArray(o.projects)
    ? o.projects
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const p = item as Record<string, unknown>;
          const title = str(p.title);
          if (!title) return null;
          return {
            title,
            description: str(p.description),
            role: str(p.role),
            period: str(p.period),
            bullets: strList(p.bullets, 12),
            link: str(p.link),
          };
        })
        .filter(Boolean)
    : [];

  const awards = strList(o.awards, 12);

  // 兼容模型输出中的别名章节：实践经历/活动经历/校园经历/实习经历等。
  // 若模型把它们放到了 schema 之外，这里做二次归类，确保不丢信息。
  const practiceLike = [
    ...maybeArray(o.practiceExperience),
    ...maybeArray(o.practiceExperiences),
    ...maybeArray(o.practices),
    ...maybeArray(o.activities),
    ...maybeArray(o.activityExperience),
    ...maybeArray(o.campusExperience),
    ...maybeArray(o.campusExperiences),
    ...maybeArray(o.internships),
    ...maybeArray(o.otherExperience),
    ...maybeArray(o.experiences),
  ];
  const looksCampus = (text: string): boolean =>
    /(学校|大学|学院|班级|社团|学生会|校队|校园|辅导员|班委|团支书|新闻中心|协会|学院团委)/i.test(
      text,
    );
  const looksWork = (text: string): boolean =>
    /(实习|公司|有限公司|科技|集团|岗位|客户|销售|工程师|顾问|全职|兼职|就业|任职)/i.test(
      text,
    );

  for (const item of practiceLike) {
    const rec = asRecord(item);
    if (!rec) continue;
    const title = str(rec.title) ?? str(rec.role) ?? str(rec.name) ?? "";
    const org =
      str(rec.company) ?? str(rec.organization) ?? str(rec.org) ?? str(rec.school) ?? "";
    const period = str(rec.period) ?? "";
    const summary = str(rec.summary) ?? str(rec.description);
    const bullets = [
      ...strList(rec.bullets, 10),
      ...strList(rec.keyResults, 10),
    ].slice(0, 10);
    const merged = `${title} ${org} ${summary ?? ""}`.trim();
    if (!merged) continue;

    if (looksCampus(merged)) {
      const edu = education[0];
      if (edu) {
        if (!edu.campusExperiences) edu.campusExperiences = [];
        const exists = edu.campusExperiences.some(
          (c) =>
            c.role === title &&
            c.period.replace(/\s/g, "") === period.replace(/\s/g, ""),
        );
        if (!exists) {
          edu.campusExperiences.push({
            role: title || org || "校园经历",
            period,
            bullets: bullets.length ? bullets : summary ? [summary] : [],
          });
        }
      }
      continue;
    }

    if (looksWork(merged)) {
      const exists = experience.some(
        (e) =>
          e.title === title &&
          e.company === org &&
          e.period.replace(/\s/g, "") === period.replace(/\s/g, ""),
      );
      if (!exists) {
        experience.push({
          title: title || "岗位",
          company: org || "公司 / 团队",
          period,
          summary,
          keyResults: bullets.length ? bullets : summary ? [summary] : [],
        });
      }
      continue;
    }

    const existsProject = projects.some(
      (p) =>
        p.title === title &&
        (p.period ?? "").replace(/\s/g, "") === period.replace(/\s/g, ""),
    );
    if (!existsProject) {
      projects.push({
        title: title || "项目经历",
        role: str(rec.role),
        period,
        description: summary,
        bullets: bullets.length ? bullets : summary ? [summary] : [],
      });
    }
  }

  return {
    name: str(o.name),
    targetRole: str(o.targetRole),
    tagline: str(o.tagline),
    contactEmail: str(o.contactEmail),
    contactPhone: str(o.contactPhone),
    contactExtra: str(o.contactExtra),
    heroPreviewLines: strList(o.heroPreviewLines, 8),
    transferableSkills: strList(o.transferableSkills, 12),
    experience: experience as ParsedResume["experience"],
    education: education as ParsedResume["education"],
    projects: projects as ParsedResume["projects"],
    awards: awards.length ? awards : undefined,
  };
}

export function isLlmParseAvailable(): boolean {
  return resolveLlmConfig() !== null;
}

/** 供前端展示当前 AI 解析配置（不含密钥） */
export function getLlmParseMeta(): {
  provider: string;
  model: string;
  baseUrl: string;
} | null {
  const cfg = resolveLlmConfig();
  if (!cfg) return null;
  const host = (() => {
    try {
      return new URL(cfg.baseUrl).hostname;
    } catch {
      return cfg.baseUrl;
    }
  })();
  const provider = /deepseek/i.test(host)
    ? "DeepSeek"
    : /openai/i.test(host)
      ? "OpenAI"
      : host;
  return { provider, model: cfg.model, baseUrl: cfg.baseUrl };
}

export async function parseResumeWithLlm(
  rawText: string,
): Promise<{ parsed: ParsedResume; confidence: number } | null> {
  const cfg = resolveLlmConfig();
  if (!cfg) return null;

  const truncated =
    rawText.length > 12000 ? `${rawText.slice(0, 12000)}\n…(已截断)` : rawText;

  const systemPrompt = `你是专业的简历结构化解析助手。从用户提供的简历纯文本中，提取并分类所有关键信息，输出严格符合 JSON Schema 的 JSON 对象（不要 markdown 代码块，不要额外说明）。

规则：
1. 自动识别中英文简历，章节可能叫「工作经历」「实习经历」「校园经历」「项目经历」「Projects」「Experience」等。
2. 严格区分三类内容：
   2.1 experience = 实习/校招/社招等「工作岗位」，公司是企业或正式机构，例如：暑期实习生、销售工程师。不要把学生会/班长/社团/竞赛队员放到 experience。
   2.2 education.campusExperiences = 校内职务与校园实践，例如：班级心理委员、学生会干部、校新闻中心成员、智能车队队员、院篮球队成员、社团活动等。不要把篮球队/学生会/班委/志愿者放进 projects。
   2.3 projects = 工程/学术/竞赛类具体项目（课程设计、智能车、电控系统、小程序开发等），通常有技术方案或系统名称；不是校园运动队、社团职务或奖学金荣誉。
3. 工作经历 experience 按时间倒序（最近的在前），每条 keyResults 提取量化成果 bullet，每条独立。
4. 项目经历 projects：每个竞赛/课程/科研项目只占一条，不要把同一项目下的多条职责、技术方案、成果拆成多个 project 对象；同一项目的细节应放在该条的 bullets 数组里。例如「惯导定位越野车（TC264）2022.12-2023.08」及其下 4–6 条技术要点 = 1 个项目，不是 5 个项目。
5. awards：每条荣誉应合并「竞赛/活动名称 + 获奖等级 + 日期」为一条字符串（如「第十八届全国大学生智能车竞赛 浙江省二等奖（2023.07）」），不要把名称和等级拆成多个数组元素。
6. 找不到的字段用 null 或空数组，不要编造；字段中不要出现“暂无”“无”等字样。
7. name 只填姓名，不要带「简历」「Resume」等词。

JSON Schema:
${PARSE_SCHEMA}`;

  const resp = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `请解析以下简历文本：\n\n${truncated}`,
        },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`llm_http_${resp.status}:${errText.slice(0, 200)}`);
  }

  const data = (await resp.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("llm_empty_response");

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("llm_invalid_json");
    json = JSON.parse(match[0]!);
  }

  const parsed = sanitizeParsed(json);
  if (!parsed) throw new Error("llm_invalid_schema");

  const hasCore =
    parsed.name ||
    parsed.experience.length > 0 ||
    parsed.education.length > 0;
  if (!hasCore) throw new Error("llm_no_core_fields");

  return { parsed, confidence: computeParseConfidence(parsed) };
}
