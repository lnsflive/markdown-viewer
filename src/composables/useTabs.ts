import { ref, computed } from "vue";
import { open, save, ask, message } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { isMarkdownPath } from "../utils/markdownPath";

export interface Tab {
  id: string;
  fileName: string;
  filePath: string | null;
  content: string;
  savedContent: string;
}

let nextId = 0;

const tabs = ref<Tab[]>([]);
const activeTabId = ref<string | null>(null);

const activeTab = computed(
  () => tabs.value.find((t) => t.id === activeTabId.value) ?? null
);

function generateId(): string {
  return `tab-${++nextId}`;
}

function extractFileName(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || "Untitled";
}

function createTab(
  fileName = "Untitled",
  filePath: string | null = null,
  content = ""
): Tab {
  const tab: Tab = {
    id: generateId(),
    fileName,
    filePath,
    content,
    savedContent: content,
  };
  tabs.value.push(tab);
  activeTabId.value = tab.id;
  return tab;
}

function closeTab(id: string) {
  const idx = tabs.value.findIndex((t) => t.id === id);
  if (idx === -1) return;
  tabs.value.splice(idx, 1);
  if (activeTabId.value === id) {
    if (tabs.value.length > 0) {
      const newIdx = Math.min(idx, tabs.value.length - 1);
      activeTabId.value = tabs.value[newIdx].id;
    } else {
      createTab();
    }
  }
}

async function requestCloseTab(id: string) {
  const tab = tabs.value.find((t) => t.id === id);
  if (!tab) return;

  if (isTabDirty(tab)) {
    const discard = await ask(
      `"${tab.fileName}" has unsaved changes. Discard them?`,
      {
        title: "Unsaved Changes",
        kind: "warning",
        okLabel: "Discard",
        cancelLabel: "Keep Editing",
      }
    );
    if (!discard) return;
  }

  closeTab(id);
}

function setActiveTab(id: string) {
  activeTabId.value = id;
}

function updateContent(content: string) {
  if (activeTab.value) {
    activeTab.value.content = content;
  }
}

function isTabDirty(tab: Tab): boolean {
  return tab.content !== tab.savedContent;
}

async function openFile(filePath?: string) {
  let path = filePath;

  if (!path) {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Markdown",
          extensions: ["md", "markdown", "mdown", "mkd", "mkdn"],
        },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (!selected) return;
    path = selected as string;
  }

  const existing = tabs.value.find((t) => t.filePath === path);
  if (existing) {
    activeTabId.value = existing.id;
    return;
  }

  try {
    const content = await readTextFile(path);
    createTab(extractFileName(path), path, content);
  } catch (err) {
    await message(`Could not open file:\n${String(err)}`, {
      title: "Open Failed",
      kind: "error",
    });
  }
}

async function saveCurrentTab(): Promise<boolean> {
  const tab = activeTab.value;
  if (!tab) return false;

  try {
    if (tab.filePath) {
      await writeTextFile(tab.filePath, tab.content);
      tab.savedContent = tab.content;
      return true;
    }
    return saveCurrentTabAs();
  } catch (err) {
    await message(`Could not save file:\n${String(err)}`, {
      title: "Save Failed",
      kind: "error",
    });
    return false;
  }
}

async function saveCurrentTabAs(): Promise<boolean> {
  const tab = activeTab.value;
  if (!tab) return false;

  const path = await save({
    filters: [
      { name: "Markdown", extensions: ["md"] },
      { name: "All Files", extensions: ["*"] },
    ],
    defaultPath:
      tab.fileName === "Untitled" ? "document.md" : tab.fileName,
  });

  if (path) {
    try {
      await writeTextFile(path, tab.content);
      tab.filePath = path;
      tab.fileName = extractFileName(path);
      tab.savedContent = tab.content;
      return true;
    } catch (err) {
      await message(`Could not save file:\n${String(err)}`, {
        title: "Save Failed",
        kind: "error",
      });
      return false;
    }
  }
  return false;
}

async function loadOpenedFiles(): Promise<boolean> {
  try {
    const paths = await invoke<string[]>("take_opened_file_paths");
    let loaded = false;
    for (const path of paths) {
      if (isMarkdownPath(path)) {
        await openFile(path);
        loaded = true;
      }
    }
    return loaded;
  } catch {
    // no files supplied by the operating system
  }
  return false;
}

function nextTab() {
  if (tabs.value.length <= 1) return;
  const idx = tabs.value.findIndex((t) => t.id === activeTabId.value);
  activeTabId.value = tabs.value[(idx + 1) % tabs.value.length].id;
}

function prevTab() {
  if (tabs.value.length <= 1) return;
  const idx = tabs.value.findIndex((t) => t.id === activeTabId.value);
  activeTabId.value =
    tabs.value[(idx - 1 + tabs.value.length) % tabs.value.length].id;
}

export function useTabs() {
  return {
    tabs,
    activeTabId,
    activeTab,
    createTab,
    closeTab,
    requestCloseTab,
    setActiveTab,
    updateContent,
    isTabDirty,
    openFile,
    saveCurrentTab,
    saveCurrentTabAs,
    loadOpenedFiles,
    nextTab,
    prevTab,
  };
}
