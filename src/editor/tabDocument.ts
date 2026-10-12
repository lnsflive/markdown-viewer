import type { EditorState } from "@codemirror/state";

export interface TabSwitchInput {
  store: Map<string, EditorState>;
  openTabIds: readonly string[];
  previousTabId: string | null;
  nextTabId: string | null;
  currentState: EditorState;
  nextDoc: string;
  createState: (doc: string) => EditorState;
}

/** Swap the live editor document without folding another tab's text into undo history. */
export function applyDocumentOrTabSwitch(input: TabSwitchInput): EditorState {
  const open = new Set(input.openTabIds);
  for (const id of input.store.keys()) {
    if (!open.has(id)) input.store.delete(id);
  }

  if (input.previousTabId !== input.nextTabId) {
    if (input.previousTabId && open.has(input.previousTabId)) {
      input.store.set(input.previousTabId, input.currentState);
    }
    const saved = input.nextTabId
      ? input.store.get(input.nextTabId)
      : undefined;
    return saved ?? input.createState(input.nextDoc);
  }

  if (input.currentState.doc.toString() === input.nextDoc) {
    return input.currentState;
  }

  return input.currentState.update({
    changes: {
      from: 0,
      to: input.currentState.doc.length,
      insert: input.nextDoc,
    },
  }).state;
}
