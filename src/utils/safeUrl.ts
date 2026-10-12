const OPEN_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function hasScheme(href: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href);
}

function protocolOf(href: string): string | null {
  try {
    return new URL(href).protocol;
  } catch {
    return null;
  }
}

/** Relative paths, in-document hashes, and http(s)/mailto/tel. */
export function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#") || !hasScheme(trimmed)) return true;
  const protocol = protocolOf(trimmed);
  return protocol !== null && OPEN_PROTOCOLS.has(protocol);
}

/** Only absolute URLs the OS opener should handle. */
export function isOpenableUrl(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed || !hasScheme(trimmed)) return false;
  const protocol = protocolOf(trimmed);
  return protocol !== null && OPEN_PROTOCOLS.has(protocol);
}

/** Relative paths and http(s) only — no javascript:/data:/file: image sources. */
export function isSafeImageSrc(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed || !hasScheme(trimmed)) return true;
  const protocol = protocolOf(trimmed);
  return protocol === "http:" || protocol === "https:";
}
