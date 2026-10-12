import { describe, expect, it } from "vitest";
import { resolveLocalImagePath } from "./imagePath";
import { renderMarkdown } from "../composables/useMarkdown";

describe("resolveLocalImagePath", () => {
  it("resolves a relative image against the markdown file directory", () => {
    expect(resolveLocalImagePath("C:/notes/doc.md", "./figure.png")).toBe(
      "C:/notes/figure.png",
    );
    expect(resolveLocalImagePath("C:/notes/doc.md", "../img/a.png")).toBe(
      "C:/img/a.png",
    );
    expect(resolveLocalImagePath("C:\\notes\\doc.md", "figure.png")).toBe(
      "C:/notes/figure.png",
    );
    expect(resolveLocalImagePath("/home/notes/doc.md", "./a.png")).toBe(
      "/home/notes/a.png",
    );
  });

  it("does not treat remote or script URLs as local files", () => {
    expect(
      resolveLocalImagePath("C:/notes/doc.md", "https://example.com/a.png"),
    ).toBeNull();
    expect(
      resolveLocalImagePath("C:/notes/doc.md", "javascript:alert(1)"),
    ).toBeNull();
  });

  it("leaves relative images unresolved when the note has no file path", () => {
    expect(resolveLocalImagePath(null, "./figure.png")).toBeNull();
  });

  it("does not climb above the drive or filesystem root", () => {
    expect(resolveLocalImagePath("C:/doc.md", "../a.png")).toBe("C:/a.png");
    expect(resolveLocalImagePath("/doc.md", "../a.png")).toBe("/a.png");
  });
});

describe("renderMarkdown images", () => {
  it("rewrites local images to asset URLs and leaves remote images in place", () => {
    const html = renderMarkdown(
      "![x](./figure.png)\n\n![y](https://example.com/a.png)\n\n![z](ftp://example.com/a.png)",
      {
        baseFilePath: "C:/notes/doc.md",
        toAssetUrl: (path) => `asset://local/${path}`,
      },
    );

    expect(html).toContain('src="asset://local/C:/notes/figure.png"');
    expect(html).toContain('src="https://example.com/a.png"');
    expect(html).toContain('src=""');
    expect(html).not.toContain("ftp:");
  });
});
