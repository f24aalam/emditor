# Emditor

Emditor is a modern, tabbed Markdown editor built with Vue 3, TypeScript, and Tauri. It offers multiple editing experiences including a WYSIWYG editor (Milkdown), a raw source editor (CodeMirror), and a split-pane preview, all wrapped in a native desktop application.

## Prerequisites

Before you can build and run Emditor, ensure you have the following installed:

* [Node.js](https://nodejs.org/)

* [Rust](https://www.rust-lang.org/) and Cargo

* OS-specific system dependencies for Tauri (see [Tauri Prerequisites](https://tauri.app/start/prerequisites/))

## Installation

1. Clone the repository and navigate into the project directory.
2. Install the frontend dependencies:

```bash
npm install
```

## Running in Development

To start the application in development mode. This will launch the Vite frontend dev server and open the Tauri desktop window:

```bash
npm run tauri dev
```

## Building for Production

To build the final optimized executable for your operating system:

```bash
npm run tauri build
```

The compiled binaries will be located in the `src-tauri/target/release/bundle/` directory.

## Terminal commands

The Debian and Windows installers add `emditor` and its shorter alias `emd` to
your terminal `PATH`. On macOS, use **Emditor → Install Emditor Shell Commands…**
once after installing the app. Terminals that were already open during
installation may need to be reopened.

```bash
emditor README.md notes.markdown
emd draft.md
emditor --wait generated.md
```

Normal commands return immediately and reuse the running Emditor window.
`--wait` (or `-w`) blocks until every requested tab has closed, which is useful
from scripts and Git workflows. A missing Markdown file opens as a blank tab and
is not created on disk until it is saved. Supported extensions are `.md`,
`.markdown`, `.mdown`, and `.mkd` (case-insensitive).

The Linux package currently installs shell commands only for the Debian target;
AppImage and sandbox-specific command installation are outside this workflow.

## Recommended IDE Setup

* [VS Code](https://code.visualstudio.com/)

* [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension

* [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) extension

* [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) extension

## License

This project is licensed under the [MIT License](./LICENSE).
