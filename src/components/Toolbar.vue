<script setup lang="ts">
import type { ViewMode } from "../composables/useViewMode";

defineProps<{
  isDark: boolean;
  viewMode: ViewMode;
  sidebarVisible: boolean;
}>();

const emit = defineEmits<{
  new: [];
  open: [];
  save: [];
  toggleTheme: [];
  toggleSidebar: [];
  setViewMode: [mode: ViewMode];
  help: [];
}>();

const modes: { key: ViewMode; label: string }[] = [
  { key: "editor", label: "Edit" },
  { key: "split", label: "Split" },
  { key: "preview", label: "Read" },
];
</script>

<template>
  <div
    class="flex items-center justify-between h-9 px-2 bg-toolbar-bg dark:bg-toolbar-bg-dark border-b border-border dark:border-border-dark select-none"
    data-tauri-drag-region
  >
    <div class="flex items-center gap-0.5">
      <button
        class="px-2 py-1 text-xs rounded transition-colors"
        :class="
          sidebarVisible
            ? 'bg-black/10 dark:bg-white/10 text-neutral-900 dark:text-neutral-100'
            : 'hover:bg-black/5 dark:hover:bg-white/5'
        "
        title="Toggle sidebar (Ctrl+B)"
        @click="emit('toggleSidebar')"
      >
        &#9776;
      </button>

      <div
        class="w-px h-4 bg-border dark:bg-border-dark mx-1"
      />

      <button
        class="px-2 py-1 text-xs rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        title="New (Ctrl+N)"
        @click="emit('new')"
      >
        New
      </button>
      <button
        class="px-2 py-1 text-xs rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        title="Open (Ctrl+O)"
        @click="emit('open')"
      >
        Open
      </button>
      <button
        class="px-2 py-1 text-xs rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        title="Save (Ctrl+S)"
        @click="emit('save')"
      >
        Save
      </button>
    </div>

    <div class="flex items-center bg-black/5 dark:bg-white/5 rounded p-0.5">
      <button
        v-for="m in modes"
        :key="m.key"
        class="px-2.5 py-0.5 text-[11px] rounded transition-colors"
        :class="
          viewMode === m.key
            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
        "
        @click="emit('setViewMode', m.key)"
      >
        {{ m.label }}
      </button>
    </div>

    <div class="flex items-center gap-0.5">
      <button
        type="button"
        class="px-2 py-1 text-xs rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        title="About Markdown Viewer"
        @click="emit('help')"
      >
        Help
      </button>
      <button
      type="button"
      class="inline-flex size-7 shrink-0 items-center justify-center rounded p-0 leading-none text-neutral-800 hover:bg-black/5 dark:text-neutral-100 dark:hover:bg-white/5 transition-colors"
      title="Toggle theme"
      @click="emit('toggleTheme')"
    >
      <svg
        v-if="isDark"
        class="block size-4"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="2.25" />
        <path
          d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.58 3.58l1.06 1.06M11.36 11.36l1.06 1.06M3.58 12.42l1.06-1.06M11.36 4.64l1.06-1.06"
        />
      </svg>
      <svg
        v-else
        class="block size-4"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          transform="translate(-0.74 0.5)"
          d="M9.2 2.15a5.35 5.35 0 1 0 4.65 7.55A4.35 4.35 0 0 1 9.2 2.15z"
        />
      </svg>
      </button>
    </div>
  </div>
</template>
