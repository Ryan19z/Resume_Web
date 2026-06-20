import { createResumeSpace, getResumeSpaceLinks } from "../lib/server/resume-space-store.ts";
import { upsertSubscription } from "../lib/server/subscription-store.ts";

const space = await createResumeSpace({ initTrial: false });
await upsertSubscription({
  resumeId: space.resumeId,
  tier: "monthly",
  status: "active",
  extendDays: 30,
  extendFromNow: true,
  note: "月租测试 · 仅规则引擎导入",
});

const links = await getResumeSpaceLinks(space.resumeId);
const toLocal = (url) =>
  url.replace(/^https?:\/\/[^/]+/, "http://localhost:3000");

console.log(
  JSON.stringify(
    {
      resumeId: space.resumeId,
      tier: "monthly",
      aiParse: false,
      smartImportPerMonth: 100,
      editUrlLocal: links ? toLocal(links.editUrl) : "",
      viewUrlLocal: links ? toLocal(links.viewUrl) : "",
      editUrlProd: links?.editUrl ?? "",
      viewUrlProd: links?.viewUrl ?? "",
    },
    null,
    2,
  ),
);
