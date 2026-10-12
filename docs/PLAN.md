# Markdown Viewer — Project Plan

## Goal

A lightweight, cross-platform markdown viewer/editor that registers as the default app for `.md` files. Replaces the need for Obsidian or platform-specific tools — just open `.md` files anywhere.

Also serves as a clean **Tauri v2 desktop app starter** that others can fork and build on.

---

## Status: v1.0.0 — Shipped

- [x] Tauri v2 + Vue 3 + TypeScript + Tailwind v4
- [x] CodeMirror 6 editor with markdown syntax highlighting
- [x] markdown-it live preview
- [x] Split pane (editor + preview) with drag resize
- [x] 3 view modes: Edit / Split / Read
- [x] Tabs (multiple files, Ctrl+Tab, middle-click close)
- [x] File operations: New, Open, Save, Save As
- [x] Drag-and-drop `.md` files
- [x] File tree sidebar (full filesystem, lazy-loaded, resizable)
- [x] Home directory shortcut (~)
- [x] Dark/light theme toggle
- [x] File association for `.md` on Windows (via NSIS installer)
- [x] Keyboard shortcuts: Ctrl+N/O/S/W/B/Tab
- [x] GitHub Actions CI for cross-platform releases
- [x] About dialog with startup update check and in-app install
- [x] Windows NSIS setup is a 4.4 MB download and about 13.1 MB installed. Other packages: MSI 5.6 MB, macOS DMG 3.7–3.8 MB, deb/rpm 4.9 MB, AppImage 79.5 MB. ~25 MB RAM

---

## Future (Separate Projects)

This repo is the **markdown viewer only**. The following are separate products that can be forked from this starting point:

| Project | Description | Builds On |
|---------|-------------|-----------|
| Universal Editor | All file types + syntax detection | This repo |
| Terminal App | xterm.js + PTY shell integration | This repo or Universal Editor |
| Agent Workspace | LLM + memory/planning + terminal | All of the above |

Each is a distinct product with a different audience. Fork this repo as a starting point rather than branching within it.

---

## Nice to Have (This Repo)

Improvements that stay within the markdown viewer scope:

- [ ] Find and replace (Ctrl+F, Ctrl+H)
- [ ] Export to HTML/PDF
- [ ] Custom CSS themes for preview
- [ ] Frontmatter support (YAML metadata)
- [ ] Mermaid diagram rendering
- [ ] Auto-save
- [ ] Word count / line count in status bar
- [ ] Proper app icon (not placeholder)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | [Tauri v2](https://v2.tauri.app/) (Rust) |
| Frontend | Vue 3 + Composition API |
| Editor | CodeMirror 6 |
| Markdown | markdown-it |
| Styling | Tailwind CSS v4 |
| Build | Vite |

The frontend framework (Vue) can be swapped for React, Svelte, Solid, or vanilla JS — the Tauri shell and Rust backend are framework-agnostic. Vue was chosen for this implementation but the patterns are portable.

---

## Framework Analysis

### Why Tauri v2?

| | Tauri v2 | Electron | Electrobun | Wails (Go) |
|---|---|---|---|---|
| Binary Size | ~5 MB | ~150 MB | ~14 MB | ~10 MB |
| RAM Usage | ~25 MB | ~100 MB+ | ~15 MB | ~30 MB |
| Startup | ~500ms | 2-5s | <50ms | ~500ms |
| Backend | Rust | JS (Node) | TS (Bun) | Go |
| Webview | System | Chromium | System + optional CEF | System |
| Maturity | Stable | Mature | Early | Stable |

### Electrobun (Watch)

[Electrobun](https://github.com/blackboardsh/electrobun) is a promising alternative — pure TypeScript, <50ms startup, 14KB update patches. Still early-stage (8k stars, active Windows issues as of Mar 2026). The Vue frontend from this project is fully portable to Electrobun if it matures.

---

## Architecture

```
markdown-viewer/
├── src/                        # Vue 3 frontend
│   ├── App.vue
│   ├── main.ts
│   ├── components/
│   │   ├── Editor.vue          # CodeMirror editor
│   │   ├── Preview.vue         # Rendered markdown preview
│   │   ├── Toolbar.vue         # Top bar: actions, view toggle, theme
│   │   ├── TabBar.vue          # File tabs
│   │   ├── SplitPane.vue       # Resizable split layout
│   │   ├── FileTree.vue        # Filesystem sidebar
│   │   └── FileTreeItem.vue    # Recursive tree node
│   ├── composables/
│   │   ├── useTabs.ts          # Tab + file management
│   │   ├── useMarkdown.ts      # markdown-it renderer
│   │   ├── useViewMode.ts      # Edit/Split/Read toggle
│   │   ├── useTheme.ts         # Dark/light mode
│   │   └── useFileTree.ts      # Filesystem navigation
│   └── assets/
│       └── styles.css
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── lib.rs              # Commands: roots, dirs, home, CLI args
│   │   └── main.rs             # Entry point
│   ├── tauri.conf.json
│   ├── capabilities/
│   ├── Cargo.toml
│   └── icons/
├── .github/workflows/
│   └── release.yml             # Cross-platform CI builds
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+N | New tab |
| Ctrl+O | Open file |
| Ctrl+S | Save |
| Ctrl+W | Close tab |
| Ctrl+B | Toggle sidebar |
| Ctrl+Tab | Next tab |
| Ctrl+Shift+Tab | Previous tab |

## Releasing

Push a tag to trigger cross-platform CI builds:

```bash
git tag v1.x.x
git push origin v1.x.x
```

GitHub Actions builds for Windows (.exe, .msi), macOS (.dmg), and Linux (.deb, .AppImage, .rpm), then creates a draft release with all artifacts attached.
