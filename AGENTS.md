# AGENTS.md - Developer & AI Assistant Guide

This document defines the architecture, design principles, domain models, technology stack, and engineering conventions for the **Daily Worklog** application. All AI agents and developers working on this codebase must follow these guidelines.

---

## 1. Project Overview & Vision

**Daily Worklog** is a fast, modern, cross-platform desktop application (macOS, Windows, Linux) designed to store, edit, organize, and visualize daily worklogs, tasks, and project deliverables using local standard Markdown files.

### Core Principles
- **Local-First & Data Ownership**: All notes and tasks are stored locally in standard Markdown (`.md`) format with optional YAML frontmatter. 100% compatible with Obsidian, VS Code, Logseq, and standard Unix tools.
- **Non-Destructive & Interoperable**: Never lock user data in proprietary databases or custom binary formats. Modifying markdown files externally must reflect seamlessly in the app.
- **Modern & Delightful UI**: Built with **Mantine UI v7** featuring a polished, clean aesthetic, responsive layout, dynamic theming (Light/Dark/Auto OS sync and custom accent palettes), and keyboard-friendly navigation.
- **Strict Separation of Concerns**: Electron main process handles secure file system I/O, IPC, and native OS integrations; React renderer manages state, rich UI components, and CodeMirror editor interactions.
- **All Code in English**: All source code, TypeScript interfaces, variables, comments, documentation, test names, and commit messages MUST be written in English.
- **Internationalization (i18n)**: UI supports English (default) and Spanish (`es`), built with a modular translation catalog.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Runtime & Platform** | Electron 34+, Node.js 24+, `electron-builder` |
| **Frontend Framework** | React 18, TypeScript 5, Vite 6 (`vite-plugin-electron`, `vite-plugin-electron-renderer`) |
| **UI Components & Theme** | Mantine UI v7 (`@mantine/core`, `@mantine/hooks`, `@mantine/dates`, `@mantine/notifications`, `@mantine/spotlight`), Tabler Icons (`@tabler/icons-react`), Lucide React |
| **Styling** | Mantine CSS styling system, CSS Modules (`*.module.css`), PostCSS with `postcss-preset-mantine` (Avoid TailwindCSS) |
| **Markdown Editor** | CodeMirror 6 (`@codemirror/state`, `@codemirror/view`, `@codemirror/lang-markdown`, `@uiw/react-codemirror`), Live Markdown decoration extensions, Tag autocomplete extension |
| **Markdown AST / Parser** | `react-markdown`, `remark-gfm`, `rehype-highlight`, `rehype-raw`, `rehype-sanitize`, `gray-matter` |
| **State Management** | Zustand 5 (with persistent store and reactive auto-save) |
| **Internationalization** | `i18next`, `react-i18next` (Translations in `src/i18n/locales/`) |
| **Date Manipulation** | `dayjs` |
| **Testing** | Vitest 5, React Testing Library, Playwright (Electron E2E), Node.js test runner (`test/verify-worklog.test.mjs`), TypeScript compiler verification (`tsc --noEmit`) |

---

## 3. Directory Structure & Architecture

```
daily-worklog/
├── electron/
│   ├── main.ts                     # Electron main process, window creation, and app lifecycle
│   ├── ipc/                        # Domain-scoped IPC handler registration
│   ├── preload.ts                  # Secure contextBridge API exposing window.electronAPI
│   └── services/                   # Vault and task file operations
├── src/
│   ├── components/
│   │   ├── editor/                 # CodeMirror 6 Markdown editor, live formatting & #tag autocompletion
│   │   │   ├── MarkdownEditor.tsx
│   │   │   ├── liveMarkdownExtension.ts
│   │   │   └── tagAutocompleteExtension.ts
│   │   ├── kanban/                 # Kanban column utilities and helpers
│   │   ├── layout/                 # AppShell layout, AppHeader, and AppSidebar navigation
│   │   ├── modals/                 # Task modal, Export modal, Onboarding wizard
│   │   │   ├── TaskModal.tsx
│   │   │   ├── ExportModal.tsx
│   │   │   └── OnboardingWizardModal.tsx
│   │   ├── routines/               # Daily checklist / recurring routines panel (drawer)
│   │   ├── settings/               # Building blocks of the Settings page
│   │   │   ├── SettingsSection.tsx # Shared section header (title, description, actions, search, vault-sync hint)
│   │   │   ├── sections/           # One component per section: General, Editor, Appearance, Areas, TaskBoard, Tags, Routines, About
│   │   │   ├── appearance/         # Shared ColorSwatchPicker, ThemeColorPicker, ColorSchemeControl
│   │   │   ├── areas/ board/ routines/ tags/  # Cards, rows, forms and editor modals used by the sections
│   │   ├── viewer/                 # Rendered Markdown visualizer with interactive GFM task checkboxes
│   │   └── views/                  # Main application views
│   │       ├── SettingsView.tsx    # Full-page Settings: section nav (views/settings/), Back control and Esc handling
│   │       ├── DailyView.tsx       # Daily worklog note editor and routines panel
│   │       ├── WeeklyView.tsx      # Continuous weekly aggregated report & KPI breakdown
│   │       ├── weekly/             # Focused weekly dashboard sections
│   │       │   └── WeeklyDashboard.tsx
│   │       ├── MonthlyView.tsx     # Continuous monthly aggregated report & KPI breakdown
│   │       ├── monthly/            # Focused monthly dashboard sections
│   │       │   ├── MonthlyDashboard.tsx
│   │       │   ├── MonthlyActivityPanels.tsx
│   │       │   └── MonthlyTaskLists.tsx
│   │       ├── YearlyView.tsx      # Annual worklog and task analytics tracking view
│   │       ├── yearly/              # Focused yearly dashboard sections
│   │       │   └── YearlyDashboard.tsx
│   │       ├── KanbanView.tsx      # Drag-and-drop task board with Area/Project tabs & progress bars
│   │       ├── TaskView.tsx        # Dedicated fullscreen task editor & detail manager
│   │       ├── PeriodDaysList.tsx  # Note summaries list for period aggregation views
│   │       └── PeriodTasksBreakdown.tsx # Task aggregation & metrics breakdown for period views
│   ├── i18n/                       # Localization setup and translation files
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── en.json             # English translations (default source of truth)
│   │       └── es.json             # Spanish translations
│   ├── shared/
│   │   └── defaultData.ts          # First-run defaults (areas, projects, routines, accent) shared by main and renderer
│   ├── store/
│   │   └── useAppStore.ts          # Central Zustand state store (reactive state, settings, tasks, notes)
│   ├── styles/                     # Global styles, fonts, and Mantine theme CSS
│   ├── types/
│   │   ├── electron.d.ts           # Type declarations for window.electronAPI
│   │   └── index.ts                # Application TypeScript interfaces & domain models
│   ├── utils/                      # Pure helper utilities
│   │   ├── areaProjectUtils.ts     # Calculations, progress bars, and cascade renames for Areas/Projects
│   │   ├── dateFormat.ts           # Date formatting helpers (formatDate, formatLocalizedDateTitle)
│   │   └── tagUtils.ts             # Tag parsing, normalization, and hierarchy helpers
│   ├── App.tsx                     # Root MantineProvider, theme configuration, and layout shell
│   └── main.tsx                    # React application entrypoint
├── test/
│   └── verify-worklog.test.mjs     # Complete unit and logic verification test suite
├── package.json                    # Dependencies, scripts, and electron-builder configuration
├── tsconfig.json                   # TypeScript compiler options
└── vite.config.ts                  # Vite build setup with Electron plugins
```

---

## 4. Vault File System & Storage Structure

When a user selects a vault folder, the application structures and persists files cleanly:

```
<UserVaultPath>/
├── .daily-worklogs/
│   └── config.json                 # Cross-device synchronized workspace settings & customizations
├── 2026/                           # Yearly subfolders for daily worklog notes
│   ├── 2026-08-20.md
│   ├── 2026-08-21.md
│   └── 2026-08-25.md
├── tasks/                          # Independent task markdown files
│   ├── implement-login.md
│   └── fix-auth-token.md
└── images/                         # Pasted / dragged attachments and media assets
```

### Key Storage Specifications:
1. **Yearly Subfolders**: Daily notes are saved under `<vault>/YYYY/YYYY-MM-DD.md`. The note scanner also maintains backward compatibility for any notes located at the vault root.
2. **Cross-Computer Sync (`.daily-worklogs/config.json`)**: When opening a vault stored in cloud folders (iCloud Drive, Dropbox, Google Drive, OneDrive, Syncthing), configuration (Kanban columns, Areas, Projects, Tags, routines, theme preferences) is automatically synchronized while keeping the machine's local directory path intact.
3. **Tasks as Markdown**: Each task in `tasks/*.md` contains YAML frontmatter (`taskId`, `title`, `status`, `priority`, `area`, `project`, `created`, `due`, `tags`, etc.) followed by a markdown body for detailed specifications and checklists.

---

## 5. Domain Models & Core Features

### 5.1. Daily Worklogs
- **One-Click Daily Note**: Instantly creates or opens today's note. New notes start with an ISO date heading (`# YYYY-MM-DD`).
- **Private Notes Section**: A heading that is exactly `Notes` (any level, case-insensitive) marks personal content that is excluded from all reports (parser in `src/utils/dailyNoteSections.ts`). Days with only Notes or untouched legacy placeholder content do not count as logged.
- **Editor Modes**: Live Preview (Obsidian-like), Split View, Code View (pure CodeMirror), and Rendered Preview.
- **Interactive Checklists**: Checkbox toggles (`- [ ]` / `- [x]`) in the visualizer update the underlying file on disk in real time.

### 5.2. Task Management (Areas & Projects Model)
- **Areas**: Permanent domains of responsibility (e.g. `Platform`, `Infrastructure`, `Operations`) without artificial deadlines. Define default tags, accent colors, and icons.
- **Projects**: Finite, goal-oriented endeavors belonging to an Area, featuring target dates, status lifecycle (*Active*, *Completed*, *On Hold*, *Archived*), and live progress bars based on task completion.
- **Automatic Sequential Task IDs**: Every task receives an auto-incrementing integer ID (e.g. `#1`, `#2`, `#12`). High-visibility badges appear on Kanban cards, period reports, and editor headers with one-click clipboard copying.
- **Context & Tag Inheritance**: Tasks assigned to an Area or Project automatically inherit context tags and properties.
- **Interactive Tag Autocomplete**: Typing `#` in the markdown editor or task description brings up a live autocomplete popover matching registered tags.

### 5.3. Periodic Aggregation & Reporting
- **Weekly & Monthly Views**: Aggregates all daily notes across the selected week (customizable week start: Monday, Sunday, etc.) or month into a continuous document.
- **KPI Metrics**: Displays active days, completed tasks, completion rate, tag breakdowns, and deliverables grouped by Area/Project.
- **Export & Share**: Single-click "Copy Report Markdown" and "Export to File" for team syncs, standups, or management reports.
- **Yearly Analytics**: Annual overview summarizing total worklogs, tasks completed, monthly activity distributions, deliverable progress, and direct navigation across any selected year.

### 5.4. Daily Routines
- Separate daily recurring checklist panel (e.g., "Check alerts", "Standup sync", "Review PRs") tracked per day in `.daily-worklogs/config.json` without cluttering the daily markdown worklog text. The on/off switch and the routine list are managed in Settings > Routines; the drawer's manage button opens that section.

### 5.5. Settings
- Settings is a full page (`currentView: 'settings'`), not a modal. `openSettings(section?)` goes through the same view switch as every other view, so the open note and task draft are flushed first and nothing changes if that fails. `closeSettings()` returns to `settingsReturnView`; `previousView` stays reserved for the task editor.
- Sections (`SettingsSectionId`): General, Editor, Appearance, Areas & Projects (`areas`), Task Board (`kanban`), Tags, Routines, About. Each renders a shared `SettingsSection` header. Sections whose data lives in `.daily-worklogs/config.json` set `scope="vault"` to show the sync hint; only `vaultPath` is per computer.
- The Back control is the way out of Settings; Esc does not leave the page. Editor dialogs inside sections stay one level deep so Esc closes just the dialog.
- Deleting or resetting Kanban columns, or hiding a column that still has tasks, always asks first and moves affected tasks through `moveTasksToStatus`, which uses the regular task status update path.
- First-run defaults live in `src/shared/defaultData.ts` and apply only to keys a vault does not have. An explicitly empty `areas` list is valid and never re-seeded.

---

## 6. Developer Guidelines & Engineering Rules

### 6.1. Coding Standards
1. **Language**: All code, identifiers, types, logs, comments, and commit messages MUST be in **English**.
2. **Type Safety**: Strictly adhere to TypeScript. Do NOT use `any` unless absolutely unavoidable for third-party interop. Keep interfaces updated in `src/types/index.ts`.
3. **Mantine UI v7 & Styling Architecture**:
   - Use Mantine UI components and hooks (`useMantineTheme`, `useMantineColorScheme`, `useMantineColor`).
   - **CSS Modules as Standard**: All component-specific styling must be encapsulated in colocated `[Component].module.css` files (e.g. `TaskView.module.css`, `AppHeader.module.css`).
   - **Mantine Style Props**: Use for standard spacing, layout, and theming (`p="md"`, `gap="xs"`, `radius="sm"`, `c="dimmed"`).
   - **No TailwindCSS**: Do NOT install or use TailwindCSS. It clashes with Mantine's preflight resets, duplicates design tokens, and conflicts with theme color schemes.
   - **PostCSS Preset Mantine**: Take advantage of `postcss-preset-mantine` functions in CSS Modules (`rem()`, `em()`, `light-dark()`, breakpoint mixins).
   - **Avoid Arbitrary Inline Styles**: Avoid repetitive `style={{ ... }}` objects in JSX. Extract them into semantic CSS module classes.
   - **Global CSS Scope**: Keep `src/styles/app.css` strictly for root CSS variables (`:root`, `[data-mantine-color-scheme="dark"]`), global resets/scrollbars, CodeMirror base classes, and rendered Markdown typography AST styles (`.markdown-body`).
4. **Electron Security & IPC**:
   - Context isolation must remain enabled (`contextIsolation: true`, `nodeIntegration: false`).
   - All filesystem operations and native dialogs must go through IPC handlers in `electron/main.ts` and be exposed typed via `electron/preload.ts` and `src/types/electron.d.ts`.
5. **Internationalization (i18n)**:
   - Never hardcode user-facing strings in UI components.
   - Always add translation keys to both `src/i18n/locales/en.json` (English) and `src/i18n/locales/es.json` (Spanish).

### 6.2. React & Frontend Guidelines
- **Component Boundaries & Modularity:** Pure client-side React 18 SPA within Electron. Structure components hierarchically, separating presentational/leaf components from stateful container views (`src/components/views/`).
- **Avoid Oversized Components (Target: < 300-400 lines):**
  - **Single Responsibility Principle (SRP):** Each component must have a single, well-defined responsibility. Avoid monolithic components that bundle data fetching, state orchestration, layout, complex sub-dialogs, and multiple UI sections into a single file.
  - **Decomposition Threshold:** Aim for **150–300 lines of code** for typical components. Components exceeding **400 lines** are prime candidates for refactoring and decomposition into smaller units.
  - **Tab & Wizard Decomposition:** Multi-tab modals (such as `SettingsModal`) and multi-step wizards (`OnboardingWizardModal`) MUST have each tab or step extracted into its own subcomponent located in a dedicated subfolder (e.g., `src/components/modals/settings/`, `src/components/modals/onboarding/`).
  - **Form & Properties Extraction:** Complex forms and sidebars (e.g., Task Properties, Kanban Cards/Columns, Filter Bars, Editor Toolbars) should be isolated into dedicated presentational components with clean TypeScript prop interfaces.
  - **Domain Component Reuse:** Shared domain UI (such as task property pickers, priority chips, checklist summaries, tag selectors) should be extracted into shared components reused across views (e.g., shared between `TaskView` and `TaskModal`).
- **Styling:** Use Mantine UI v7 and CSS Modules (`*.module.css`) exclusively with `postcss-preset-mantine`. Avoid runtime CSS-in-JS (`styled-components`, Emotion) and do NOT use or install Tailwind CSS.
- **Data & File System Operations:** Never use `useEffect` for data loading or syncing state. Manage all note, task, and settings operations through the central Zustand store (`src/store/useAppStore.ts`) and typed Electron IPC (`window.electronAPI`).
- **State:** Derive state during render or via store selectors instead of syncing via effects. Keep ephemeral state colocated to the consuming component.
- **Optimization:** Do not prematurely add `useCallback` or `useMemo` unless handling heavy computational work, large lists, or profiling dictates it.
- **Typing:** Strict TypeScript only. No `any` or untyped props. Ensure all component props and callbacks have explicit, descriptive TypeScript interfaces.

### 6.3. Development & Verification Workflow
Before finalizing any code modifications or introducing new features, always run the verification steps:

```bash
# 1. Typecheck the entire TypeScript codebase
npm run typecheck

# 2. Run the automated unit and component test suite (Vitest)
npm test

# 3. Run Electron End-to-End tests (Playwright)
npm run test:e2e

# 4. Test building the renderer
npm run build:renderer
```

### 6.4. Adding New Features Checklist
When implementing new features or refactoring existing ones:
- [ ] Update domain models in `src/types/index.ts`.
- [ ] If IPC or file system actions are involved, update `electron/main.ts`, `electron/preload.ts`, and `src/types/electron.d.ts`.
- [ ] Add translation strings to both `src/i18n/locales/en.json` and `src/i18n/locales/es.json`.
- [ ] Integrate state changes into Zustand store (`src/store/useAppStore.ts`).
- [ ] Update or add automated tests in `test/verify-worklog.test.mjs`.
- [ ] Verify that `npm run typecheck` and `npm test` pass with zero errors.
- [ ] Keep `README.md` and `CHANGELOG.md` in sync when bumping versions or adding major capabilities.

### 6.5. AI Model Roles
Thinking and reviewing must be separated from implementation, using the model assigned to each role:

| Provider | Thinking & Reviewing | Implementation | Agent Orchestration |
|---|---|---|---|
| **Gemini** | Gemini Argon | Gemini Flash | — |
| **Claude** | Claude Opus | Claude Sonnet | Claude Haiku |

- **Thinking & Reviewing**: Gemini Argon and Claude Opus analyze tasks, design solutions, plan the work, and review the finished changes.
- **Implementation**: Gemini Flash and Claude Sonnet write the code, following the plan produced by the thinking model of the same provider.
- **Agent Orchestration**: Claude Haiku coordinates multi-agent work (dispatching subagents, routing tasks, collecting results). It does not plan, review, or write code itself.
