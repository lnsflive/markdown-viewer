export type UpdatePhase =
  | "idle"
  | "checking"
  | "upToDate"
  | "updateAvailable"
  | "unsupported"
  | "error"
  | "updating";

export interface AboutUpdateState {
  phase: UpdatePhase;
  currentVersion: string;
  latestVersion: string | null;
  status: string;
  dialogOpen: boolean;
}

export interface CheckOutcome {
  latestVersion: string | null;
  updateAvailable: boolean;
  installSupported: boolean;
  error: string | null;
  fromStartup: boolean;
}

export const UP_TO_DATE_STATUS = "You're up to date";
export const UPDATE_AVAILABLE_STATUS = "Update available";
export const UNSUPPORTED_STATUS =
  "In-app update is not available for this package.";

export function initialAboutState(currentVersion: string): AboutUpdateState {
  return {
    phase: "idle",
    currentVersion,
    latestVersion: null,
    status: "",
    dialogOpen: false,
  };
}

export function openAbout(state: AboutUpdateState): AboutUpdateState {
  return { ...state, dialogOpen: true };
}

export function closeAbout(state: AboutUpdateState): AboutUpdateState {
  if (state.phase === "updating") return state;
  return { ...state, dialogOpen: false };
}

export function beginCheck(state: AboutUpdateState): AboutUpdateState {
  return { ...state, phase: "checking", status: "" };
}

export function applyCheck(
  state: AboutUpdateState,
  outcome: CheckOutcome,
): AboutUpdateState {
  if (outcome.error) {
    return {
      ...state,
      phase: "error",
      latestVersion: null,
      status: outcome.error,
      dialogOpen: outcome.fromStartup ? false : state.dialogOpen,
    };
  }

  if (outcome.updateAvailable && !outcome.installSupported) {
    return {
      ...state,
      phase: "unsupported",
      latestVersion: outcome.latestVersion,
      status: UNSUPPORTED_STATUS,
      dialogOpen: true,
    };
  }

  if (outcome.updateAvailable) {
    return {
      ...state,
      phase: "updateAvailable",
      latestVersion: outcome.latestVersion,
      status: UPDATE_AVAILABLE_STATUS,
      dialogOpen: outcome.fromStartup ? true : state.dialogOpen,
    };
  }

  return {
    ...state,
    phase: "upToDate",
    latestVersion: outcome.latestVersion ?? state.currentVersion,
    status: UP_TO_DATE_STATUS,
    dialogOpen: outcome.fromStartup ? false : state.dialogOpen,
  };
}

export function beginInstall(state: AboutUpdateState): AboutUpdateState {
  if (state.phase !== "updateAvailable") return state;
  return {
    ...state,
    phase: "updating",
    status: "Starting download…",
    dialogOpen: true,
  };
}

export function applyProgress(
  state: AboutUpdateState,
  status: string,
): AboutUpdateState {
  if (state.phase !== "updating") return state;
  return { ...state, status };
}

export function applyInstallError(
  state: AboutUpdateState,
  error: string,
): AboutUpdateState {
  return {
    ...state,
    phase: "updateAvailable",
    status: error,
    dialogOpen: true,
  };
}

export function latestLabel(state: AboutUpdateState): string {
  return state.latestVersion ?? "Not checked";
}

export function checkButtonLabel(state: AboutUpdateState): string {
  if (state.phase === "checking") return "Checking…";
  if (state.phase === "updating") return "Updating…";
  if (state.phase === "updateAvailable") return "Update";
  return "Check for updates";
}

export function checkButtonDisabled(state: AboutUpdateState): boolean {
  return state.phase === "checking" || state.phase === "updating";
}

const INSTALLABLE_BUNDLES = new Set([
  "nsis",
  "msi",
  "app",
  "appimage",
  "deb",
  "rpm",
]);

/** Dev builds report no bundle type and cannot self-update. */
export function installSupported(bundleType: string | null): boolean {
  return bundleType !== null && INSTALLABLE_BUNDLES.has(bundleType);
}

export function versionInfoText(
  state: AboutUpdateState,
  os: string,
  arch: string,
): string {
  const latest = state.latestVersion ?? "not checked";
  return `Markdown Viewer ${state.currentVersion}\nLatest: ${latest}\nOS: ${os} ${arch}`;
}

export function formatDownloadProgress(
  downloaded: number,
  total: number | null,
): string {
  if (total && total > 0) {
    return `Downloaded ${formatBytes(downloaded)} of ${formatBytes(total)}`;
  }
  return `Downloaded ${formatBytes(downloaded)}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
