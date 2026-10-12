const MD_EXT = /\.(md|markdown|mdown|mkd|mkdn)$/i;

export function isMarkdownPath(path: string): boolean {
  return MD_EXT.test(path);
}
