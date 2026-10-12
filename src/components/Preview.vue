<script setup lang="ts">
import { ref } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isOpenableUrl } from "../utils/safeUrl";

defineProps<{
  html: string;
}>();

const previewRef = ref<HTMLDivElement>();

async function onPreviewClick(e: MouseEvent) {
  const target = e.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest("a");
  if (!anchor || !previewRef.value?.contains(anchor)) return;

  const href = anchor.getAttribute("href");
  if (href && href.startsWith("#") && href.length > 1) return;

  e.preventDefault();
  if (!href || !isOpenableUrl(href)) return;

  try {
    await openUrl(href);
  } catch {
    // ignore failed external open
  }
}
</script>

<template>
  <div
    ref="previewRef"
    class="markdown-body h-full overflow-auto p-6"
    v-html="html"
    @click="onPreviewClick"
    @auxclick="onPreviewClick"
  />
</template>
