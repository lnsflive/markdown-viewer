import { history, undoDepth } from "@codemirror/commands";
import { EditorState, Transaction } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { applyDocumentOrTabSwitch } from "./tabDocument";

function createState(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [history()] });
}

function typeChar(state: EditorState, ch: string): EditorState {
  return state.update({
    changes: { from: state.doc.length, insert: ch },
    annotations: Transaction.userEvent.of("input"),
  }).state;
}

describe("applyDocumentOrTabSwitch", () => {
  it("keeps undo history and cursor state when leaving a tab and coming back", () => {
    const store = new Map<string, EditorState>();
    const edited = typeChar(createState("Hello"), "!");
    expect(undoDepth(edited)).toBe(1);

    const other = applyDocumentOrTabSwitch({
      store,
      openTabIds: ["a", "b"],
      previousTabId: "a",
      nextTabId: "b",
      currentState: edited,
      nextDoc: "Other",
      createState,
    });
    expect(other.doc.toString()).toBe("Other");

    const restored = applyDocumentOrTabSwitch({
      store,
      openTabIds: ["a", "b"],
      previousTabId: "b",
      nextTabId: "a",
      currentState: other,
      nextDoc: "Hello!",
      createState,
    });

    expect(restored).toBe(edited);
    expect(restored.doc.toString()).toBe("Hello!");
    expect(undoDepth(restored)).toBe(1);
  });

  it("does not record a tab switch as an edit of the tab being left", () => {
    const store = new Map<string, EditorState>();
    const original = createState("Alpha");

    applyDocumentOrTabSwitch({
      store,
      openTabIds: ["a", "b"],
      previousTabId: "a",
      nextTabId: "b",
      currentState: original,
      nextDoc: "Beta",
      createState,
    });

    const restored = store.get("a");
    expect(restored?.doc.toString()).toBe("Alpha");
    expect(undoDepth(restored!)).toBe(0);
  });

  it("drops state for tabs that have been closed", () => {
    const store = new Map<string, EditorState>();
    store.set("closed", createState("gone"));
    const current = createState("stay");

    applyDocumentOrTabSwitch({
      store,
      openTabIds: ["stay"],
      previousTabId: "stay",
      nextTabId: "stay",
      currentState: current,
      nextDoc: "stay",
      createState,
    });

    expect(store.has("closed")).toBe(false);
  });
});
