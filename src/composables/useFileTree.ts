import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { segmentsAfterRoot } from "../utils/pathSegments";

export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[] | null;
  expanded: boolean;
  loading: boolean;
}

interface RustDirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

const roots = ref<TreeNode[]>([]);
const sidebarVisible = ref(true);

async function loadRoots() {
  const rootPaths = await invoke<string[]>("list_roots");
  roots.value = rootPaths.map((p) => ({
    name: p,
    path: p,
    isDir: true,
    children: null,
    expanded: false,
    loading: false,
  }));
}

async function loadChildren(node: TreeNode) {
  if (node.children !== null || !node.isDir) return;
  node.loading = true;
  try {
    const entries = await invoke<RustDirEntry[]>("read_directory", {
      path: node.path,
    });
    node.children = entries.map((e) => ({
      name: e.name,
      path: e.path,
      isDir: e.is_dir,
      children: null,
      expanded: false,
      loading: false,
    }));
  } catch {
    node.children = [];
  }
  node.loading = false;
}

async function toggleNode(node: TreeNode) {
  if (!node.isDir) return;
  if (!node.expanded) {
    await loadChildren(node);
  }
  node.expanded = !node.expanded;
}

async function navigateToHome() {
  const home = await invoke<string | null>("get_home_dir");
  if (!home) return;

  // Find the matching root
  let current: TreeNode | undefined;
  let matchedRoot: TreeNode | undefined;
  for (const root of roots.value) {
    const rootNorm = root.path.replace(/\\/g, "/").replace(/\/$/, "");
    const homeNorm = home.replace(/\\/g, "/");
    if (homeNorm.toLowerCase().startsWith(rootNorm.toLowerCase())) {
      matchedRoot = root;
      current = root;
      break;
    }
  }
  if (!current || !matchedRoot) return;

  const segments = segmentsAfterRoot(matchedRoot.path, home);
  if (segments.length === 0) return;

  // Expand down to home
  if (!current.expanded) {
    await loadChildren(current);
    current.expanded = true;
  }

  // Build the path progressively and expand each segment
  let builtPath = current.path.replace(/\\/g, "/").replace(/\/$/, "");
  for (const seg of segments) {
    const target = builtPath + "/" + seg;
    if (!current!.children) break;
    const child: TreeNode | undefined = current!.children.find(
      (c: TreeNode) =>
        c.path.replace(/\\/g, "/").replace(/\/$/, "").toLowerCase() ===
        target.toLowerCase()
    );
    if (!child || !child.isDir) break;
    if (!child.expanded) {
      await loadChildren(child);
      child.expanded = true;
    }
    current = child;
    builtPath = target;
  }
}

function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value;
}

export function useFileTree() {
  return {
    roots,
    sidebarVisible,
    loadRoots,
    loadChildren,
    toggleNode,
    navigateToHome,
    toggleSidebar,
  };
}
