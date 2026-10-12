<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import {
  checkButtonDisabled,
  checkButtonLabel,
  latestLabel,
  type AboutUpdateState,
} from "../updates/aboutUpdate";

const props = defineProps<{
  state: AboutUpdateState;
}>();

const emit = defineEmits<{
  close: [];
  check: [];
  install: [];
  copy: [];
}>();

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.state.phase !== "updating") {
    event.preventDefault();
    emit("close");
  }
}

function onPrimary() {
  if (props.state.phase === "updateAvailable") emit("install");
  else emit("check");
}

onMounted(() => window.addEventListener("keydown", onKeyDown));
onUnmounted(() => window.removeEventListener("keydown", onKeyDown));
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
  >
    <div
      class="w-full max-w-sm rounded-lg border border-border bg-white p-4 text-neutral-900 shadow-lg dark:border-border-dark dark:bg-neutral-900 dark:text-neutral-100"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <h2 id="about-title" class="text-sm font-semibold">
        About Markdown Viewer
      </h2>

      <dl class="mt-3 space-y-1 text-xs">
        <div class="flex justify-between gap-4">
          <dt class="text-neutral-500 dark:text-neutral-400">Version</dt>
          <dd>{{ state.currentVersion || "…" }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-neutral-500 dark:text-neutral-400">Latest</dt>
          <dd>{{ latestLabel(state) }}</dd>
        </div>
      </dl>

      <p class="mt-3 min-h-4 text-xs text-neutral-600 dark:text-neutral-300">
        {{ state.status }}
      </p>

      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="rounded px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
          @click="emit('copy')"
        >
          Copy version info
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-xs hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/5"
          :disabled="state.phase === 'updating'"
          @click="emit('close')"
        >
          Close
        </button>
        <button
          type="button"
          class="rounded bg-neutral-900 px-2 py-1 text-xs text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
          :disabled="checkButtonDisabled(state)"
          @click="onPrimary"
        >
          {{ checkButtonLabel(state) }}
        </button>
      </div>
    </div>
  </div>
</template>
