<script setup lang="ts">
import type { TreeNode } from "../composables/useFileTree";
import { isMarkdownPath } from "../utils/markdownPath";

const props = defineProps<{
  node: TreeNode;
  depth: number;
}>();

const emit = defineEmits<{
  toggle: [node: TreeNode];
  openFile: [path: string];
}>();

function onClick() {
  if (props.node.isDir) {
    emit("toggle", props.node);
  } else if (isMarkdownPath(props.node.name)) {
    emit("openFile", props.node.path);
  }
}
</script>

<template>
  <div>
    <button
      class="flex items-center w-full text-left py-0.5 pr-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
      :style="{ paddingLeft: depth * 14 + 6 + 'px' }"
      :title="node.path"
      @click="onClick"
    >
      <!-- Arrow for directories -->
      <span
        v-if="node.isDir"
        class="w-4 shrink-0 text-[10px] text-neutral-400 dark:text-neutral-500"
      >
        <span v-if="node.loading" class="animate-spin inline-block">↻</span>
        <span v-else>{{ node.expanded ? "▾" : "▸" }}</span>
      </span>
      <span v-else class="w-4 shrink-0" />

      <!-- Name -->
      <span
        class="truncate"
        :class="[
          node.isDir
            ? 'text-neutral-700 dark:text-neutral-300 font-medium'
            : isMarkdownPath(node.name)
              ? 'text-accent'
              : 'text-neutral-500 dark:text-neutral-400',
        ]"
      >
        {{ node.name }}
      </span>
    </button>

    <!-- Children -->
    <div v-if="node.isDir && node.expanded && node.children">
      <FileTreeItem
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        @toggle="(n) => emit('toggle', n)"
        @open-file="(p) => emit('openFile', p)"
      />
      <div
        v-if="node.children.length === 0"
        class="py-0.5 text-[11px] text-neutral-400 dark:text-neutral-600 italic"
        :style="{ paddingLeft: (depth + 1) * 14 + 20 + 'px' }"
      >
        empty
      </div>
    </div>
  </div>
</template>
