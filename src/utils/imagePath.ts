const WINDOWS_ABS = /^[a-zA-Z]:[\\/]/;
const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/** Absolute filesystem path for a local markdown image, or null when the src stays remote. */
export function resolveLocalImagePath(
  baseFilePath: string | null,
  src: string,
): string | null {
  const trimmed = decodeLocalSrc(src.trim());
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) {
    return null;
  }
  if (!isLocalFileSrc(trimmed)) return null;

  const normalizedSrc = normalizePath(trimmed);
  if (isAbsolutePath(normalizedSrc)) return normalizedSrc;
  if (!baseFilePath) return null;
  return joinPath(directoryOf(baseFilePath), normalizedSrc);
}

function decodeLocalSrc(src: string): string {
  if (!src.includes("%")) return src;
  try {
    return decodeURI(src);
  } catch {
    return src;
  }
}

function isLocalFileSrc(src: string): boolean {
  if (WINDOWS_ABS.test(src) || src.startsWith("/") || src.startsWith("./") || src.startsWith("../")) {
    return true;
  }
  return !SCHEME.test(src);
}

function isAbsolutePath(p: string): boolean {
  return p.startsWith("/") || WINDOWS_ABS.test(p);
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

function directoryOf(filePath: string): string {
  const norm = normalizePath(filePath);
  const slash = norm.lastIndexOf("/");
  if (slash < 0) return ".";
  if (slash === 0) return "/";
  return norm.slice(0, slash);
}

function joinPath(dir: string, rel: string): string {
  const base = normalizePath(dir).replace(/\/$/, "");
  const parts = base === "" ? [""] : base.split("/");

  for (const seg of normalizePath(rel).split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      const top = parts[parts.length - 1];
      const atRoot =
        parts.length <= 1 || (parts.length === 2 && parts[0] === "" && top === "");
      const atDrive = parts.length === 1 && /^[a-zA-Z]:$/.test(top ?? "");
      if (!atRoot && !atDrive) parts.pop();
      continue;
    }
    parts.push(seg);
  }

  if (parts.length === 1 && parts[0] === "") return "/";
  return parts.join("/");
}
