import { describe, expect, it } from "vitest";
import {
  applyCheck,
  applyInstallError,
  applyProgress,
  beginCheck,
  beginInstall,
  checkButtonDisabled,
  checkButtonLabel,
  closeAbout,
  formatDownloadProgress,
  initialAboutState,
  installSupported,
  latestLabel,
  openAbout,
  UP_TO_DATE_STATUS,
  UPDATE_AVAILABLE_STATUS,
  UNSUPPORTED_STATUS,
  versionInfoText,
} from "./aboutUpdate";

describe("about update state", () => {
  it("starts unchecked with the dialog closed", () => {
    const state = initialAboutState("1.0.1");
    expect(state.phase).toBe("idle");
    expect(state.dialogOpen).toBe(false);
    expect(latestLabel(state)).toBe("Not checked");
    expect(checkButtonLabel(state)).toBe("Check for updates");
  });

  it("opens the dialog from Help and closes it until an install starts", () => {
    const open = openAbout(initialAboutState("1.0.1"));
    expect(open.dialogOpen).toBe(true);
    expect(closeAbout(open).dialogOpen).toBe(false);

    const updating = beginInstall(
      applyCheck(open, {
        latestVersion: "1.0.2",
        updateAvailable: true,
        installSupported: true,
        error: null,
        fromStartup: false,
      }),
    );
    expect(closeAbout(updating)).toEqual(updating);
  });

  it("keeps the dialog closed on startup when the app is current or the check fails", () => {
    const checking = beginCheck(initialAboutState("1.0.1"));
    expect(checking.phase).toBe("checking");
    expect(checkButtonLabel(checking)).toBe("Checking…");
    expect(checkButtonDisabled(checking)).toBe(true);

    const current = applyCheck(checking, {
      latestVersion: "1.0.1",
      updateAvailable: false,
      installSupported: true,
      error: null,
      fromStartup: true,
    });
    expect(current.phase).toBe("upToDate");
    expect(current.dialogOpen).toBe(false);
    expect(current.status).toBe(UP_TO_DATE_STATUS);
    expect(latestLabel(current)).toBe("1.0.1");

    const failed = applyCheck(checking, {
      latestVersion: null,
      updateAvailable: false,
      installSupported: true,
      error: "network down",
      fromStartup: true,
    });
    expect(failed.phase).toBe("error");
    expect(failed.dialogOpen).toBe(false);
    expect(failed.status).toBe("network down");
    expect(latestLabel(failed)).toBe("Not checked");
    expect(checkButtonLabel(failed)).toBe("Check for updates");
  });

  it("opens the dialog on startup when a newer version can be installed", () => {
    const next = applyCheck(beginCheck(initialAboutState("1.0.1")), {
      latestVersion: "1.0.2",
      updateAvailable: true,
      installSupported: true,
      error: null,
      fromStartup: true,
    });
    expect(next.dialogOpen).toBe(true);
    expect(next.phase).toBe("updateAvailable");
    expect(next.status).toBe(UPDATE_AVAILABLE_STATUS);
    expect(checkButtonLabel(next)).toBe("Update");
    expect(latestLabel(next)).toBe("1.0.2");
  });

  it("opens the dialog for an unsupported package without offering Update", () => {
    const next = applyCheck(beginCheck(initialAboutState("1.0.1")), {
      latestVersion: "1.0.2",
      updateAvailable: true,
      installSupported: false,
      error: null,
      fromStartup: true,
    });
    expect(next.dialogOpen).toBe(true);
    expect(next.phase).toBe("unsupported");
    expect(next.status).toBe(UNSUPPORTED_STATUS);
    expect(checkButtonLabel(next)).toBe("Check for updates");
    expect(beginInstall(next).phase).toBe("unsupported");
  });

  it("keeps a manual dialog open when the check fails or the app is current", () => {
    const open = beginCheck(openAbout(initialAboutState("1.0.1")));
    const failed = applyCheck(open, {
      latestVersion: null,
      updateAvailable: false,
      installSupported: true,
      error: "signature mismatch",
      fromStartup: false,
    });
    expect(failed.dialogOpen).toBe(true);
    expect(failed.status).toBe("signature mismatch");

    const current = applyCheck(open, {
      latestVersion: "1.0.1",
      updateAvailable: false,
      installSupported: true,
      error: null,
      fromStartup: false,
    });
    expect(current.dialogOpen).toBe(true);
    expect(current.phase).toBe("upToDate");
  });

  it("reports download progress and returns to Update after an install error", () => {
    const available = applyCheck(openAbout(initialAboutState("1.0.1")), {
      latestVersion: "1.0.2",
      updateAvailable: true,
      installSupported: true,
      error: null,
      fromStartup: false,
    });
    const updating = beginInstall(available);
    expect(updating.phase).toBe("updating");
    expect(checkButtonLabel(updating)).toBe("Updating…");
    expect(checkButtonDisabled(updating)).toBe(true);

    const progress = applyProgress(
      updating,
      formatDownloadProgress(1024, 2 * 1024 * 1024),
    );
    expect(progress.status).toBe("Downloaded 1.0 KB of 2.0 MB");

    const failed = applyInstallError(progress, "signature mismatch");
    expect(failed.phase).toBe("updateAvailable");
    expect(failed.dialogOpen).toBe(true);
    expect(failed.status).toBe("signature mismatch");
    expect(checkButtonLabel(failed)).toBe("Update");
  });
});

describe("install support and version info", () => {
  it("allows in-app updates for every bundled package and not for dev builds", () => {
    for (const bundle of ["nsis", "msi", "app", "appimage", "deb", "rpm"]) {
      expect(installSupported(bundle)).toBe(true);
    }
    expect(installSupported(null)).toBe(false);
    expect(installSupported("unknown")).toBe(false);
  });

  it("copies the version block, using not checked before a check finishes", () => {
    const state = initialAboutState("1.0.1");
    expect(versionInfoText(state, "windows", "x86_64")).toBe(
      "Markdown Viewer 1.0.1\nLatest: not checked\nOS: windows x86_64",
    );
    const checked = applyCheck(state, {
      latestVersion: "1.0.2",
      updateAvailable: true,
      installSupported: true,
      error: null,
      fromStartup: false,
    });
    expect(versionInfoText(checked, "linux", "x86_64")).toBe(
      "Markdown Viewer 1.0.1\nLatest: 1.0.2\nOS: linux x86_64",
    );
  });
});
