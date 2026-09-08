export type EditorFlushHandler = () => Promise<boolean>;

let taskEditorFlushHandler: EditorFlushHandler | null = null;

/**
 * Registers the currently mounted task editor as the owner of task draft
 * persistence. The returned cleanup only removes the same registration, which
 * avoids an older React effect clearing a newer handler.
 */
export function registerTaskEditorFlush(handler: EditorFlushHandler): () => void {
  taskEditorFlushHandler = handler;
  return () => {
    if (taskEditorFlushHandler === handler) taskEditorFlushHandler = null;
  };
}

export async function flushTaskEditor(): Promise<boolean> {
  return taskEditorFlushHandler ? taskEditorFlushHandler() : true;
}
