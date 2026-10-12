<script setup lang="ts">
import { nextTick, onUnmounted, ref } from "vue";
import type { ShellIntegrationStatus } from "../composables/useShellIntegration";

defineProps<{
  shellIntegration: ShellIntegrationStatus;
  shellIntegrationBusy: boolean;
}>();

const emit = defineEmits<{
  open: [];
  about: [];
  toggleShellIntegration: [];
}>();

const isOpen = ref(false);
const rootRef = ref<HTMLDivElement>();
const buttonRef = ref<HTMLButtonElement>();
const menuRef = ref<HTMLDivElement>();

function menuItems(): HTMLButtonElement[] {
  return Array.from(
    menuRef.value?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not([disabled])',
    ) ?? [],
  );
}

function focusItem(index: number) {
  const items = menuItems();
  if (!items.length) return;
  items[(index + items.length) % items.length].focus();
}

function onDocumentPointerDown(e: PointerEvent) {
  if (!rootRef.value?.contains(e.target as Node)) close(false);
}

async function open(focusIndex = 0) {
  if (isOpen.value) return;
  isOpen.value = true;
  emit("open");
  document.addEventListener("pointerdown", onDocumentPointerDown);
  await nextTick();
  focusItem(focusIndex);
}

function close(restoreFocus = true) {
  if (!isOpen.value) return;
  isOpen.value = false;
  document.removeEventListener("pointerdown", onDocumentPointerDown);
  if (restoreFocus) buttonRef.value?.focus();
}

function toggleOpen() {
  if (isOpen.value) close();
  else void open();
}

function onButtonKeyDown(e: KeyboardEvent) {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    void open(e.key === "ArrowDown" ? 0 : -1);
  }
}

function onMenuKeyDown(e: KeyboardEvent) {
  const items = menuItems();
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      focusItem(index + 1);
      break;
    case "ArrowUp":
      e.preventDefault();
      focusItem(index - 1);
      break;
    case "Home":
      e.preventDefault();
      focusItem(0);
      break;
    case "End":
      e.preventDefault();
      focusItem(-1);
      break;
    case "Escape":
      e.preventDefault();
      close();
      break;
    case "Tab":
      close(false);
      break;
  }
}

function select(action: "about" | "toggleShellIntegration") {
  close();
  if (action === "about") emit("about");
  else emit("toggleShellIntegration");
}

onUnmounted(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown);
});

const itemClass =
  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-black/5 focus:bg-black/5 focus:outline-none disabled:opacity-50 dark:hover:bg-white/10 dark:focus:bg-white/10";
</script>

<template>
  <div ref="rootRef" class="relative">
    <button
      ref="buttonRef"
      type="button"
      class="px-2 py-1 text-xs rounded transition-colors"
      :class="
        isOpen
          ? 'bg-black/10 dark:bg-white/10'
          : 'hover:bg-black/5 dark:hover:bg-white/5'
      "
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      aria-controls="help-menu"
      @click="toggleOpen"
      @keydown="onButtonKeyDown"
    >
      Help
    </button>

    <div
      v-if="isOpen"
      id="help-menu"
      ref="menuRef"
      role="menu"
      aria-label="Help"
      class="absolute right-0 top-full z-50 mt-1 min-w-60 rounded-md border border-border bg-white py-1 text-neutral-900 shadow-lg dark:border-border-dark dark:bg-neutral-900 dark:text-neutral-100"
      @keydown="onMenuKeyDown"
    >
      <template v-if="shellIntegration !== 'unsupported'">
        <button
          type="button"
          role="menuitem"
          :class="itemClass"
          :disabled="shellIntegrationBusy"
          :title="
            shellIntegration === 'enabled'
              ? 'Click to remove it from the right-click New menu'
              : 'Adds Markdown Document to your file manager\'s right-click New menu'
          "
          @click="select('toggleShellIntegration')"
        >
          <span class="w-3 text-center" aria-hidden="true">{{
            shellIntegration === "enabled" ? "✓" : ""
          }}</span>
          {{
            shellIntegration === "enabled"
              ? "Added to right-click menu"
              : "Add “New Markdown” to right-click menu"
          }}
        </button>
        <div
          role="separator"
          class="my-1 h-px bg-border dark:bg-border-dark"
        />
      </template>
      <button
        type="button"
        role="menuitem"
        :class="itemClass"
        @click="select('about')"
      >
        <span class="w-3" aria-hidden="true" />
        About Markdown Viewer
      </button>
    </div>
  </div>
</template>
