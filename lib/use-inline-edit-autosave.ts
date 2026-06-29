import { registerInlineEdit } from "@/lib/inline-edit-registry";
import { useEffect, useRef } from "react";

type Options = {
  debounceMs?: number;
  /** 外部 site 快照变化时跳过下一次自动保存，避免回写旧数据 */
  resetToken?: string;
};

export function useInlineEditAutosave(
  id: string,
  enabled: boolean,
  save: () => void,
  deps: unknown[],
  options?: Options,
): void {
  const debounceMs = options?.debounceMs ?? 550;
  const resetToken = options?.resetToken;
  const dirtyRef = useRef(false);
  const saveRef = useRef(save);
  saveRef.current = save;
  const skipRef = useRef(true);
  const prevResetRef = useRef(resetToken);

  useEffect(() => {
    return registerInlineEdit(id, {
      flush: () => {
        if (dirtyRef.current && enabled) {
          saveRef.current();
          dirtyRef.current = false;
        }
      },
      isDirty: () => dirtyRef.current && enabled,
    });
  }, [id, enabled]);

  useEffect(() => {
    if (resetToken !== undefined && resetToken !== prevResetRef.current) {
      prevResetRef.current = resetToken;
      skipRef.current = true;
      dirtyRef.current = false;
    }
  }, [resetToken]);

  useEffect(() => {
    if (!enabled) {
      skipRef.current = true;
      return;
    }
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    dirtyRef.current = true;
    const timer = window.setTimeout(() => {
      saveRef.current();
      dirtyRef.current = false;
    }, debounceMs);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps supplied by caller
  }, [...deps, enabled, debounceMs]);
}
