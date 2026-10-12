import { convertFileSrc } from "@tauri-apps/api/core";
import MarkdownIt from "markdown-it";
import { resolveLocalImagePath } from "../utils/imagePath";
import { isSafeHref, isSafeImageSrc } from "../utils/safeUrl";

export interface RenderMarkdownOptions {
  baseFilePath?: string | null;
  toAssetUrl?: (absolutePath: string) => string;
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
});

const defaultLinkOpen = md.renderer.rules.link_open;
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet("href");
  if (href && !isSafeHref(href)) {
    tokens[idx].attrSet("href", "#");
  }
  return defaultLinkOpen
    ? defaultLinkOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

const defaultImage = md.renderer.rules.image;
md.renderer.rules.image = (tokens, idx, options, env: RenderMarkdownOptions, self) => {
  const src = tokens[idx].attrGet("src");
  if (src) {
    const local = resolveLocalImagePath(env?.baseFilePath ?? null, src);
    if (local) {
      const toUrl = env?.toAssetUrl ?? convertFileSrc;
      tokens[idx].attrSet("src", toUrl(local));
    } else if (!isSafeImageSrc(src)) {
      tokens[idx].attrSet("src", "");
    }
  }
  return defaultImage
    ? defaultImage(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

export function renderMarkdown(
  source: string,
  options: RenderMarkdownOptions = {},
): string {
  return md.render(source, options);
}

export function useMarkdown() {
  function render(source: string, baseFilePath: string | null = null): string {
    return renderMarkdown(source, { baseFilePath });
  }
  return { render };
}
