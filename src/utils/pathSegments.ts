/** Path segments after `root`, excluding the Windows drive letter when root is a drive root. */
export function segmentsAfterRoot(root: string, fullPath: string): string[] {
  const rootNorm = normalizePath(root).replace(/\/$/, "");
  const fullNorm = normalizePath(fullPath);
  if (!fullNorm.toLowerCase().startsWith(rootNorm.toLowerCase())) {
    return [];
  }
  const remainder = fullNorm.slice(rootNorm.length).replace(/^\//, "");
  if (!remainder) return [];
  return remainder.split("/").filter(Boolean);
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}
