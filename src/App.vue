<script setup lang="ts">
import type { UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import { computed, onMounted, onUnmounted, ref } from "vue";
import AboutDialog from "./components/AboutDialog.vue";
import Editor from "./components/Editor.vue";
import FileTree from "./components/FileTree.vue";
import Preview from "./components/Preview.vue";
import TabBar from "./components/TabBar.vue";
import Toolbar from "./components/Toolbar.vue";
import type { TreeNode } from "./composables/useFileTree";
import { useFileTree } from "./composables/useFileTree";
import { useMarkdown } from "./composables/useMarkdown";
import { useTabs } from "./composables/useTabs";
import { useTheme } from "./composables/useTheme";
import type { ViewMode } from "./composables/useViewMode";
import { useViewMode } from "./composables/useViewMode";
import { isMarkdownPath } from "./utils/markdownPath";
import { useAboutUpdate } from "./updates/useAboutUpdate";

const { isDark, initTheme, toggleTheme } = useTheme();
const { render } = useMarkdown();
const {
  tabs,
  activeTabId,
  activeTab,
  createTab,
  requestCloseTab,
  setActiveTab,
  updateContent,
  isTabDirty,
  openFile,
  saveCurrentTab,
  loadOpenedFiles,
  nextTab,
  prevTab,
} = useTabs();
const { viewMode, setViewMode } = useViewMode();
const {
  roots,
  sidebarVisible,
  loadRoots,
  toggleNode,
  navigateToHome,
  toggleSidebar,
} = useFileTree();
const {
  state: aboutState,
  loadEnvironment,
  checkForUpdates,
  installUpdate,
  copyVersionInfo,
  showAbout,
  hideAbout,
} = useAboutUpdate();

const isDragOver = ref(false);
let unlistenDrop: UnlistenFn | null = null;
let unlistenEnter: UnlistenFn | null = null;
let unlistenLeave: UnlistenFn | null = null;
let unlistenOpenedFiles: UnlistenFn | null = null;

const activeContent = computed(() => activeTab.value?.content ?? "");
const openTabIds = computed(() => tabs.value.map((tab) => tab.id));
const renderedHtml = computed(() =>
  render(activeContent.value, activeTab.value?.filePath ?? null),
);

const sidebarWidth = ref(240);
const isResizingSidebar = ref(false);
const splitPercent = ref(50);
const isResizingSplit = ref(false);
const mainContentRef = ref<HTMLDivElement>();

function onSidebarResizeStart(e: MouseEvent) {
  e.preventDefault();
  isResizingSidebar.value = true;
  const onMove = (ev: MouseEvent) => {
    sidebarWidth.value = Math.min(Math.max(ev.clientX, 140), 500);
  };
  const onUp = () => {
    isResizingSidebar.value = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

function onSplitResizeStart(e: MouseEvent) {
  e.preventDefault();
  isResizingSplit.value = true;
  const onMove = (ev: MouseEvent) => {
    if (!mainContentRef.value) return;
    const rect = mainContentRef.value.getBoundingClientRect();
    const percent = ((ev.clientX - rect.left) / rect.width) * 100;
    splitPercent.value = Math.min(Math.max(percent, 20), 80);
  };
  const onUp = () => {
    isResizingSplit.value = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

function onEditorUpdate(value: string) {
  updateContent(value);
}

function onTreeOpenFile(path: string) {
  openFile(path);
}

function onTreeToggle(node: TreeNode) {
  toggleNode(node);
}

function onKeyDown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key === "n") {
    e.preventDefault();
    createTab();
  } else if (mod && e.key === "o") {
    e.preventDefault();
    openFile();
  } else if (mod && e.key === "s") {
    e.preventDefault();
    saveCurrentTab();
  } else if (mod && e.key === "w") {
    e.preventDefault();
    if (activeTab.value) requestCloseTab(activeTab.value.id);
  } else if (mod && e.key === "b") {
    e.preventDefault();
    toggleSidebar();
  } else if (mod && e.key === "Tab") {
    e.preventDefault();
    if (e.shiftKey) prevTab();
    else nextTab();
  }
}

async function setupDragDrop() {
  unlistenEnter = await listen("tauri://drag-enter", () => {
    isDragOver.value = true;
  });
  unlistenLeave = await listen("tauri://drag-leave", () => {
    isDragOver.value = false;
  });
  unlistenDrop = await listen<{ paths: string[] }>(
    "tauri://drag-drop",
    async (event) => {
      isDragOver.value = false;
      for (const path of event.payload.paths) {
        if (isMarkdownPath(path)) {
          await openFile(path);
        }
      }
    },
  );
}

onMounted(async () => {
  const environmentReady = loadEnvironment().catch(() => undefined);
  initTheme();
  window.addEventListener("keydown", onKeyDown);
  unlistenOpenedFiles = await listen("markdown-files-opened", () => {
    void loadOpenedFiles();
  });
  await setupDragDrop();
  await loadRoots();
  const loaded = await loadOpenedFiles();
  if (!loaded) {
    createTab(
      "Welcome.md",
      null,
      `# Welcome to Markdown Viewer

Start typing here — your changes appear live on the right.

## Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+N | New tab |
| Ctrl+O | Open file |
| Ctrl+S | Save |
| Ctrl+W | Close tab |
| Ctrl+B | Toggle sidebar |
| Ctrl+Tab | Next tab |

## Tips

- **Drag and drop** \`.md\` files onto the window to open them
- Use the **Edit / Split / Read** toggle to switch views
- Middle-click a tab to close it
- Browse your filesystem in the sidebar, click any \`.md\` file to open it

> Built with Tauri v2 + Vue 3
`,
    );
  }
  await environmentReady;
  void checkForUpdates(true);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
  unlistenDrop?.();
  unlistenEnter?.();
  unlistenLeave?.();
  unlistenOpenedFiles?.();
});
</script>

<template>
  <div
    class="h-screen w-screen flex flex-col overflow-hidden"
    :class="{ 'select-none': isResizingSidebar || isResizingSplit }"
  >
    <Toolbar
      :is-dark="isDark"
      :view-mode="viewMode"
      :sidebar-visible="sidebarVisible"
      @new="createTab()"
      @open="openFile()"
      @save="saveCurrentTab()"
      @toggle-theme="toggleTheme"
      @toggle-sidebar="toggleSidebar"
      @set-view-mode="(m: ViewMode) => setViewMode(m)"
      @help="showAbout()"
    />

    <TabBar
      :tabs="tabs"
      :active-tab-id="activeTabId"
      :is-tab-dirty="isTabDirty"
      @select="setActiveTab"
      @close="requestCloseTab"
      @new-tab="createTab()"
    />

    <div class="flex flex-1 overflow-hidden relative">
      <!-- Sidebar -->
      <div
        v-if="sidebarVisible"
        class="shrink-0 bg-toolbar-bg dark:bg-toolbar-bg-dark border-r border-border dark:border-border-dark overflow-hidden"
        :style="{ width: sidebarWidth + 'px' }"
      >
        <FileTree
          :nodes="roots"
          @toggle="onTreeToggle"
          @open-file="onTreeOpenFile"
          @navigate-home="navigateToHome"
        />
      </div>

      <!-- Sidebar resize handle -->
      <div
        v-if="sidebarVisible"
        class="w-1 cursor-col-resize hover:bg-accent transition-colors shrink-0"
        @mousedown="onSidebarResizeStart"
      />

      <!-- Main content: single editor instance across view modes -->
      <div ref="mainContentRef" class="flex flex-1 overflow-hidden h-full">
        <div
          v-show="viewMode !== 'preview'"
          class="h-full overflow-hidden shrink-0"
          :style="
            viewMode === 'split'
              ? { width: splitPercent + '%' }
              : { width: '100%' }
          "
        >
          <Editor
            :model-value="activeContent"
            :is-dark="isDark"
            :tab-id="activeTabId"
            :open-tab-ids="openTabIds"
            @update:model-value="onEditorUpdate"
            @save="saveCurrentTab()"
          />
        </div>

        <div
          v-if="viewMode === 'split'"
          class="w-1 cursor-col-resize bg-border hover:bg-accent dark:bg-border-dark dark:hover:bg-accent transition-colors shrink-0"
          @mousedown="onSplitResizeStart"
        />

        <div
          v-show="viewMode !== 'editor'"
          class="h-full overflow-hidden flex-1 bg-preview-bg dark:bg-preview-bg-dark"
        >
          <Preview :html="renderedHtml" />
        </div>
      </div>

      <!-- Drag-drop overlay -->
      <Transition name="fade">
        <div
          v-if="isDragOver"
          class="absolute inset-0 z-50 flex items-center justify-center bg-accent/10 backdrop-blur-sm border-2 border-dashed border-accent rounded-lg m-2"
        >
          <p class="text-lg font-semibold text-accent">
            Drop markdown files here
          </p>
        </div>
      </Transition>
    </div>

    <AboutDialog
      v-if="aboutState.dialogOpen"
      :state="aboutState"
      @close="hideAbout()"
      @check="checkForUpdates(false)"
      @install="installUpdate()"
      @copy="copyVersionInfo()"
    />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
