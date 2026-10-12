import { ref } from "vue";

export type ViewMode = "editor" | "split" | "preview";

const viewMode = ref<ViewMode>("split");

function setViewMode(mode: ViewMode) {
  viewMode.value = mode;
}

function cycleViewMode() {
  const modes: ViewMode[] = ["editor", "split", "preview"];
  const idx = modes.indexOf(viewMode.value);
  viewMode.value = modes[(idx + 1) % modes.length];
}

export function useViewMode() {
  return { viewMode, setViewMode, cycleViewMode };
}
