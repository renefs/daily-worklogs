# Daily Worklog 📝

A modern, fast, cross-platform desktop application (Windows, macOS, Linux) to store, edit, and visualize your daily worklog using standard Markdown files.

Built with **React**, **TypeScript**, **Mantine UI v7**, **CodeMirror 6**, and **Electron**.

Current version: **1.15.3** — see the [changelog](CHANGELOG.md) for release details.

---

## ✨ Features

- 📂 **Local Markdown Storage (User Vault)**: Store your `.md` files anywhere on your filesystem. 100% compatible with Obsidian, VSCode, Logseq, and standard markdown tools.
- ✍️ **Modern Markdown Editor**: Syntax highlighting, formatting toolbar (Headings, Checkboxes, Code, Tables), word & character counters, live task completion indicators, and customizable font size.
- 👁️ **Visualizer with Interactive Checklists**: Beautiful live preview where toggling checkboxes updates the underlying Markdown file on disk in real time.
- 📅 **Daily Notes**: Create today's note with a single click; new notes start with a date heading. Anything under a `## Notes` heading stays private and never appears in reports.
- 📊 **Unified Reports Workspace**: Switch between Week, Month, and Year using a shared date anchor, previous/next controls, direct period pickers, and a current-period shortcut. Drill down from a year to a month, week, and daily note. A persistent icon rail switches views, and a collapsible history sidebar keeps notes accessible throughout the app. A compact calendar picker in Daily provides direct date selection.
- 📊 **Weekly & Monthly Continuous Reports**: Continuous document compiling all notes from the week (Mon–Sun or customized start/end day) or month with KPI metrics (Active Days, Completed Tasks, Completion Rate). Instant **Copy Report Markdown** and **Export to file** for team syncs.
- 📈 **Yearly Analytics & Tracking**: Comprehensive annual tracking view summarizing total worklogs, completed tasks, monthly activity distributions, and deliverable progress across Areas and Projects.
- 📋 **Task Management with Areas & Projects**: Kanban board and dedicated Task View featuring permanent Areas of responsibility, finite Projects with live progress bars, automatic sequential GitHub-style IDs (`#1`, `#2`), and tag inheritance. Done and Cancelled columns show the newest closed tasks first within a configurable recent window (default 30 days), with an inline "Show older" toggle and search that always reaches older tasks.
- 🏷️ **Interactive Tagging & Autocomplete**: Live `#` tag autocomplete popup inside the markdown editor and task descriptions, with full tag management in Settings.
- ⚙️ **Full-Page Settings**: A dedicated Settings page with a section navigation (General, Editor, Appearance, Areas & Projects, Task Board, Tags, Routines, About). Back or Esc returns to where you were, and deleting a board column asks where its tasks should go.
- 🔄 **Cross-Device Vault Synchronization**: Workspace configuration automatically synchronizes across devices when using iCloud, Dropbox, OneDrive, Google Drive, or Syncthing. Settings sections that follow the vault say so.
- ⚡ **Memory-Efficient Data Loading**: Task details, period note content, and heavy modal code load on demand, with segmented routine history and built-in memory diagnostics.
- 🎨 **Mantine UI v7 Theming**: Light, Dark, and Automatic OS-synced mode support with 9 curated accent color themes.
- 🌐 **Multi-Language (i18n)**: Full English (default) and Spanish support with instant language switching. Modular architecture ready for more languages.
- 💻 **Cross-Platform**: Designed for Windows, macOS, and Linux.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v24 or higher)
- npm (v9 or higher)

### Installation
```bash
# Clone the repository
git clone https://github.com/renefs/daily-worklogs.git
cd daily-worklogs

# Install dependencies
npm install
```

### Running in Development
```bash
npm run dev
```

### Type Checking & Building
```bash
# Type check TypeScript
npm run typecheck

# Build renderer and Electron bundles
npm run build:renderer

# Run the synthetic memory regression benchmark
npm run benchmark:memory

# Build production installer / package for your OS
npm run build
```

---

## 🏗️ Project Architecture

```
daily-worklog/
├── electron/
│   ├── main.ts              # Electron process startup, window lifecycle, and OS integrations
│   ├── preload.ts           # Typed ContextBridge API
│   ├── ipc/                 # Domain-scoped IPC handler registration
│   ├── services/            # Vault file and path operations
│   └── utils/               # Security, atomic writes, and bounded concurrency
├── src/
│   ├── components/
│   │   ├── editor/          # CodeMirror 6 Markdown Editor & Toolbar
│   │   ├── viewer/          # Rendered Markdown Visualizer with interactive tasks
│   │   ├── layout/          # AppShell, AppHeader, AppSidebar
│   │   ├── modals/          # Onboarding, task, and export dialogs
│   │   ├── settings/        # Settings sections and their managers (areas, board, tags, routines)
│   │   ├── tasks/           # Shared task detail and property components
│   │   ├── views/           # Daily, period, yearly, Kanban, task, and Settings views
│   │   │   ├── monthly/     # Monthly dashboard sections
│   │   │   ├── weekly/      # Weekly dashboard sections
│   │   │   └── yearly/      # Yearly dashboard sections
│   ├── i18n/                # Translation catalogs (en.json, es.json)
│   ├── shared/              # Defaults shared by the main process and the renderer
│   ├── store/               # Zustand store composed from domain slices
│   ├── styles/              # Mantine CSS imports & typography
│   ├── types/               # TypeScript interfaces & API definitions
│   ├── App.tsx              # Root Mantine Provider & Theme setup
│   └── main.tsx             # React entry point
└── package.json
```

Pull requests are checked in GitHub Actions with TypeScript typechecking, Vitest,
Electron end-to-end tests, and a renderer build.

---

## 📄 License
MIT
