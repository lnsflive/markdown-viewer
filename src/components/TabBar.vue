<script setup lang="ts">
import type { Tab } from "../composables/useTabs";

defineProps<{
  tabs: Tab[];
  activeTabId: string | null;
  isTabDirty: (tab: Tab) => boolean;
}>();

const emit = defineEmits<{
  select: [id: string];
  close: [id: string];
  newTab: [];
}>();

function onMouseDown(e: MouseEvent, id: string) {
  if (e.button === 1) {
    e.preventDefault();
    emit("close", id);
  }
}
</script>

<template>
  <div
    class="flex items-end h-9 bg-toolbar-bg dark:bg-toolbar-bg-dark border-b border-border dark:border-border-dark overflow-x-auto overflow-y-hidden select-none"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="group flex items-center gap-1.5 h-8 px-3 text-xs border-r border-border dark:border-border-dark shrink-0 transition-colors"
      :class="
        tab.id === activeTabId
          ? 'bg-white dark:bg-editor-bg-dark text-neutral-900 dark:text-neutral-100'
          : 'bg-transparent text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5'
      "
      @click="emit('select', tab.id)"
      @mousedown="onMouseDown($event, tab.id)"
    >
      <span class="max-w-32 truncate">{{ tab.fileName }}</span>
      <span
        v-if="isTabDirty(tab)"
        class="text-amber-500 text-base leading-none"
        >&bull;</span
      >
      <span
        class="ml-0.5 w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 text-[10px]"
        :class="{ 'opacity-100': tab.id === activeTabId }"
        @click.stop="emit('close', tab.id)"
        >&times;</span
      >
    </button>

    <button
      class="flex items-center justify-center w-8 h-8 shrink-0 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm"
      title="New tab"
      @click="emit('newTab')"
    >
      +
    </button>
  </div>
</template>
