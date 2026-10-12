import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { arch, platform } from "@tauri-apps/plugin-os";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { ref } from "vue";
import {
  applyCheck,
  applyInstallError,
  applyProgress,
  beginCheck,
  beginInstall,
  closeAbout,
  formatDownloadProgress,
  initialAboutState,
  installSupported,
  openAbout,
  versionInfoText,
  type AboutUpdateState,
} from "./aboutUpdate";

export function useAboutUpdate() {
  const state = ref<AboutUpdateState>(initialAboutState(""));
  const osName = ref("unknown");
  const archName = ref("unknown");
  let canInstall = false;
  let pending: Update | null = null;

  async function loadEnvironment() {
    const [version, os, cpu, bundleType] = await Promise.all([
      getVersion(),
      Promise.resolve(platform()),
      Promise.resolve(arch()),
      invoke<string | null>("install_bundle_type"),
    ]);
    osName.value = os;
    archName.value = cpu;
    canInstall = installSupported(bundleType);
    state.value = { ...state.value, currentVersion: version };
  }

  async function checkForUpdates(fromStartup: boolean) {
    if (state.value.phase === "checking" || state.value.phase === "updating") {
      return;
    }
    if (!state.value.currentVersion) {
      try {
        await loadEnvironment();
      } catch (error) {
        state.value = applyCheck(state.value, {
          latestVersion: null,
          updateAvailable: false,
          installSupported: false,
          error: errorText(error),
          fromStartup,
        });
        return;
      }
    }

    state.value = beginCheck(state.value);
    await closePending();
    try {
      const update = await check();
      if (!update) {
        state.value = applyCheck(state.value, {
          latestVersion: state.value.currentVersion,
          updateAvailable: false,
          installSupported: canInstall,
          error: null,
          fromStartup,
        });
        return;
      }
      if (!canInstall) await update.close();
      else pending = update;
      state.value = applyCheck(state.value, {
        latestVersion: update.version,
        updateAvailable: true,
        installSupported: canInstall,
        error: null,
        fromStartup,
      });
    } catch (error) {
      state.value = applyCheck(state.value, {
        latestVersion: null,
        updateAvailable: false,
        installSupported: canInstall,
        error: errorText(error),
        fromStartup,
      });
    }
  }

  async function installUpdate() {
    const update = pending;
    if (!update || state.value.phase !== "updateAvailable") return;
    state.value = beginInstall(state.value);
    let downloaded = 0;
    let total: number | null = null;
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? null;
          state.value = applyProgress(
            state.value,
            formatDownloadProgress(0, total),
          );
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          state.value = applyProgress(
            state.value,
            formatDownloadProgress(downloaded, total),
          );
        } else {
          state.value = applyProgress(state.value, "Installing…");
        }
      });
      pending = null;
      if (platform() !== "windows") await relaunch();
    } catch (error) {
      state.value = applyInstallError(state.value, errorText(error));
    }
  }

  async function copyVersionInfo() {
    try {
      await writeText(
        versionInfoText(state.value, osName.value, archName.value),
      );
    } catch (error) {
      state.value = { ...state.value, status: errorText(error) };
    }
  }

  function showAbout() {
    state.value = openAbout(state.value);
  }

  function hideAbout() {
    state.value = closeAbout(state.value);
  }

  async function closePending() {
    const update = pending;
    pending = null;
    if (update) await update.close();
  }

  return {
    state,
    osName,
    archName,
    loadEnvironment,
    checkForUpdates,
    installUpdate,
    copyVersionInfo,
    showAbout,
    hideAbout,
  };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
