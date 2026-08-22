# Daily Worklog 📝

A modern, fast, cross-platform desktop application (Windows, macOS, Linux) to store, edit, and visualize your daily worklog using standard Markdown files.

Built with **React**, **TypeScript**, **Mantine UI v7**, **CodeMirror 6**, and **Electron**.

---

## ✨ Features

- 📂 **Local Markdown Storage (User Vault)**: Store your `.md` files anywhere on your filesystem. 100% compatible with Obsidian, VSCode, Logseq, and standard markdown tools.
- ✍️ **Modern Markdown Editor**: Syntax highlighting, formatting toolbar (Headings, Checkboxes, Code, Tables), word & character counters, live task completion indicators, and customizable font size.
- 👁️ **Visualizer with Interactive Checklists**: Beautiful live preview where toggling checkboxes updates the underlying Markdown file on disk in real time.
- 📅 **Daily Notes with Customizable Templates**: Create today's note with a single click. Choose from built-in templates (Standard Worklog, Agile Standup, Simple Checklist, Blank) or configure your own in Settings.
- 📊 **Weekly Continuous Executive Report**: Continuous document compiling all notes from the week (Mon–Sun or customized start/end day) with KPI metrics (Active Days, Completed Tasks, Completion Rate). Instant **Copy Report Markdown** and **Export to file** for weekly team meetings.
- 🗓️ **Monthly Overview**: Month-at-a-glance digest compiling all days of the selected month.
- 📆 **Calendar & Archive Browser**: Visual calendar highlighting days with notes. Jump to any date, week, or month instantly.
- 🎨 **Mantine UI v7 Theming**: Light and Dark mode support with 9 curated accent color themes (Indigo, Teal, Violet, Cyan, Green, Orange, Grape, Blue, Pink).
- 🌐 **Multi-Language (i18n)**: Full English (default) and Spanish support with instant language switching. Modular architecture ready for more languages.
- 💻 **Cross-Platform**: Designed for Windows, macOS, and Linux.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/daily-worklog.git
cd daily-worklog

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

# Build production installer / package for your OS
npm run build
```

---

## 🏗️ Project Architecture

```
daily-worklog/
├── electron/
│   ├── main.ts              # Electron main process & IPC handlers (Vault, FS, Dialogs)
│   └── preload.ts           # ContextBridge secure API bridge
├── src/
│   ├── components/
│   │   ├── editor/          # CodeMirror 6 Markdown Editor & Toolbar
│   │   ├── viewer/          # Rendered Markdown Visualizer with interactive tasks
│   │   ├── layout/          # AppShell, AppHeader, AppSidebar
│   │   ├── modals/          # SettingsModal, ExportModal
│   │   └── views/           # DailyView, WeeklyView, MonthlyView, CalendarView
│   ├── i18n/                # Translation catalogs (en.json, es.json)
│   ├── store/               # Zustand store for app state & reactive saves
│   ├── styles/              # Mantine CSS imports & typography
│   ├── types/               # TypeScript interfaces & API definitions
│   ├── App.tsx              # Root Mantine Provider & Theme setup
│   └── main.tsx             # React entry point
└── package.json
```

---

## 📄 License
MIT
