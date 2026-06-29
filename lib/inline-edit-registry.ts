type InlineEditEntry = {
  flush: () => void;
  isDirty: () => boolean;
};

const entries = new Map<string, InlineEditEntry>();

export function registerInlineEdit(
  id: string,
  entry: InlineEditEntry,
): () => void {
  entries.set(id, entry);
  return () => {
    entries.delete(id);
  };
}

/** 立即写入所有尚未防抖落盘的 inline 编辑内容 */
export function flushInlineEdits(): void {
  for (const entry of entries.values()) {
    if (entry.isDirty()) entry.flush();
  }
}

export function hasDirtyInlineEdits(): boolean {
  for (const entry of entries.values()) {
    if (entry.isDirty()) return true;
  }
  return false;
}
