/** 简历解析支持的格式（客户端 / 服务端共用，无 Node 依赖） */

const RESUME_PARSE_EXTS = new Set([".pdf", ".docx", ".doc", ".txt"]);

export function isResumeParseExt(ext: string): boolean {
  return RESUME_PARSE_EXTS.has(ext.toLowerCase());
}

export function resumeParseAcceptList(): string {
  return ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
}
