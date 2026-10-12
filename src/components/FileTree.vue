<script setup lang="ts">
import type { TreeNode } from "../composables/useFileTree";
import FileTreeItem from "./FileTreeItem.vue";

defineProps<{
  nodes: TreeNode[];
}>();

const emit = defineEmits<{
  toggle: [node: TreeNode];
  openFile: [path: string];
  navigateHome: [];
}>();
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div
      class="flex items-center justify-between h-8 px-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 border-b border-border dark:border-border-dark shrink-0"
    >
      <span>Explorer</span>
      <button
        class="text-xs normal-case tracking-normal font-normal px-1.5 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
        title="Go to home folder"
        @click="emit('navigateHome')"
      >
        ~
      </button>
    </div>
    <div class="flex-1 overflow-auto py-1 text-[13px]">
      <FileTreeItem
        v-for="node in nodes"
        :key="node.path"
        :node="node"
        :depth="0"
        @toggle="(n) => emit('toggle', n)"
        @open-file="(p) => emit('openFile', p)"
      />
    </div>
  </div>
</template>
