<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from "vue";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection } from "@codemirror/view";
import { EditorState, Compartment, Transaction } from "@codemirror/state";
import { applyDocumentOrTabSwitch } from "../editor/tabDocument";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from "@codemirror/language";

const props = defineProps<{
  modelValue: string;
  isDark: boolean;
  tabId: string | null;
  openTabIds: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  save: [];
}>();

const editorRef = ref<HTMLDivElement>();
const view = shallowRef<EditorView>();
const themeCompartment = new Compartment();
const tabStates = new Map<string, EditorState>();

const darkTheme = EditorView.theme(
  {
    "&": { backgroundColor: "#1a1a2e", color: "#e2e8f0" },
    ".cm-content": { caretColor: "#a5b4fc" },
    ".cm-gutters": { backgroundColor: "#1a1a2e", color: "#64748b", borderRight: "1px solid #2d2d5e" },
    ".cm-activeLine": { backgroundColor: "rgba(99, 102, 241, 0.08)" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(99, 102, 241, 0.08)" },
    ".cm-selectionBackground": { backgroundColor: "rgba(99, 102, 241, 0.25) !important" },
    "&.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(99, 102, 241, 0.25) !important" },
    ".cm-cursor": { borderLeftColor: "#a5b4fc" },
  },
  { dark: true }
);

const lightTheme = EditorView.theme({
  "&": { backgroundColor: "#ffffff", color: "#1e293b" },
  ".cm-gutters": { backgroundColor: "#f8fafc", color: "#94a3b8", borderRight: "1px solid #e2e8f0" },
  ".cm-activeLine": { backgroundColor: "rgba(99, 102, 241, 0.05)" },
  ".cm-activeLineGutter": { backgroundColor: "rgba(99, 102, 241, 0.05)" },
});

const saveKeymap = keymap.of([
  {
    key: "Mod-s",
    stopPropagation: true,
    run: () => {
      emit("save");
      return true;
    },
  },
]);

function themeExtension(isDark: boolean) {
  return themeCompartment.of(isDark ? darkTheme : lightTheme);
}

function retheme(state: EditorState, isDark: boolean): EditorState {
  return state.update({
    effects: themeCompartment.reconfigure(isDark ? darkTheme : lightTheme),
    annotations: Transaction.addToHistory.of(false),
  }).state;
}

function createState(doc: string, isDark: boolean) {
  return EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      drawSelection(),
      rectangularSelection(),
      bracketMatching(),
      indentOnInput(),
      history(),
      highlightSelectionMatches(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
      saveKeymap,
      themeExtension(isDark),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit("update:modelValue", update.state.doc.toString());
        }
      }),
    ],
  });
}

onMounted(() => {
  if (!editorRef.value) return;
  view.value = new EditorView({
    state: createState(props.modelValue, props.isDark),
    parent: editorRef.value,
  });
});

onUnmounted(() => {
  view.value?.destroy();
  view.value = undefined;
});

watch(
  () => [props.tabId, props.modelValue, props.openTabIds.join("\0")] as const,
  ([tabId, modelValue], prev) => {
    if (!view.value) return;
    const previousTabId = prev?.[0] ?? null;
    let next = applyDocumentOrTabSwitch({
      store: tabStates,
      openTabIds: props.openTabIds,
      previousTabId,
      nextTabId: tabId,
      currentState: view.value.state,
      nextDoc: modelValue,
      createState: (doc) => createState(doc, props.isDark),
    });
    if (previousTabId !== tabId) next = retheme(next, props.isDark);
    if (next !== view.value.state) view.value.setState(next);
    if (tabId) tabStates.set(tabId, view.value.state);
  },
);

watch(
  () => props.isDark,
  (isDark) => {
    if (!view.value) return;
    const next = retheme(view.value.state, isDark);
    view.value.setState(next);
    if (props.tabId) tabStates.set(props.tabId, next);
    for (const [id, state] of tabStates) {
      if (id !== props.tabId) tabStates.set(id, retheme(state, isDark));
    }
  },
);

defineExpose({
  focus: () => view.value?.focus(),
});
</script>

<template>
  <div ref="editorRef" class="h-full w-full overflow-hidden" />
</template>
