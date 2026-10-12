import { invoke } from "@tauri-apps/api/core";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { ref } from "vue";

export type ShellIntegrationStatus = "unsupported" | "enabled" | "disabled";

export function useShellIntegration() {
  const status = ref<ShellIntegrationStatus>("unsupported");
  const busy = ref(false);

  async function refresh() {
    try {
      status.value = await invoke<ShellIntegrationStatus>(
        "shell_integration_status",
      );
    } catch {
      status.value = "unsupported";
    }
  }

  async function toggle() {
    if (busy.value || status.value === "unsupported") return;
    const enable = status.value === "disabled";

    if (!enable) {
      const confirmed = await ask(
        'Remove "Markdown Document" from the right-click New menu?',
        { title: "Markdown Viewer", kind: "info" },
      );
      if (!confirmed) return;
    }

    busy.value = true;
    try {
      status.value = await invoke<ShellIntegrationStatus>(
        "set_shell_integration",
        { enabled: enable },
      );
    } catch (err) {
      await message(`Could not update the right-click menu:\n${String(err)}`, {
        title: "Markdown Viewer",
        kind: "error",
      });
      await refresh();
    } finally {
      busy.value = false;
    }
  }

  return { status, busy, refresh, toggle };
}
