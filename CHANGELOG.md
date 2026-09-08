# Changelog

All notable changes to the **Daily Worklog** application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [1.11.0] - 2026-09-08

### Added
- **Task Editor Flush Service**: Added an editor flush service that guarantees unsaved task drafts and daily notes are persisted before view navigation, date changes, or application shutdown.
- **Save Failure Feedback & Notifications**: Added robust error handling and localized notifications when note saves fail, keeping dirty drafts open with actionable recovery feedback.
- **Vitest Unit Test Suite**: Migrated test infrastructure to Vitest with comprehensive unit and component testing across store, vault services, area/project utilities, and UI views.
- **Playwright E2E Testing**: Integrated Playwright for Electron end-to-end test automation covering application launch, daily note authoring, and Kanban boards.

### Changed
- **Continuous Editor Sessions**: Live, source, split, and preview mode changes now preserve the mounted CodeMirror session, including cursor position and undo history.
- **Lean Markdown Language Support**: Replaced the full CodeMirror language catalog with the Markdown GFM parser needed by the editor, substantially reducing editor-related renderer chunks.
- **Sidebar Action Clarification**: Renamed "New Today" action to "Open Today's Note" in the sidebar with updated English and Spanish translations to accurately describe opening or creating today's note.

### Fixed
- **Lossless Navigation and Shutdown**: Dirty daily notes and task drafts are flushed before changing dates, switching views, returning from the task editor, or closing the application. Failed saves keep the editor open with actionable feedback.
- **Stable Task Auto-Save Identity**: New task drafts retain the filename and task ID returned by their first save, preventing later auto-saves from creating duplicate Markdown files.
- **External Edit Detection**: Vault watcher events are ignored only when their file contents match the application's own write, so rapid cloud or external edits are no longer silently suppressed.
- **Long Document Rendering**: Fenced code blocks and GFM tables render correctly when only their middle is visible in the editor viewport.
- **Reliable Editor Input**: Image drops insert at the drop position and report partial failures, formatting works across multiple selections, and tag completion avoids code spans, fenced code, URLs, and false positives such as `C#`.
- **Safe Markdown Media**: Rendered images use the same destination validation as the live editor, and missing-image fallback content no longer relies on HTML injection.
- **Editor Accessibility**: Toolbar actions and interactive live-preview widgets now expose localized accessible names, keyboard activation, and visible focus states.

### Testing
- Added regression coverage for failed-save navigation, edits during in-flight saves, stable task draft identity, long viewport-spanning Markdown constructs, and editor toolbar accessibility.
- Integrated full Vitest unit test suite and Playwright end-to-end test framework.

## [1.10.0] - 2026-09-07

### Added
- **Global Save & Shortcut Support**: Implemented manual save functionality accessible via `Cmd+S` / `Ctrl+S`, the application `File -> Save` menu item, and an IPC bridge to persist daily notes and task drafts immediately.
- **Save Feedback Notifications**: Added localized toast notifications confirming successful note and task saves along with error reporting.

### Changed
- **Task Header Layout**: Enhanced task editor header layout and styling for improved usability and alignment.

## [1.9.1] - 2026-09-03

### Fixed
- **Task Sidebar State**: Opening a task now preserves the sidebar's current expanded or collapsed state, and its controls continue to work in the task editor.

## [1.9.0] - 2026-09-02

### Added
- **Live Editor Safety Tests**: Added verification for Markdown syntax-node matching and safe link and image destination handling.
- **Localized Live Widgets**: Added English and Spanish labels for code-copy actions, editable tables, and missing-image feedback.

### Changed
- **Viewport-Scoped Live Preview**: Live Markdown decorations now render only the visible editor region plus a small buffer, keeping editing responsive in long notes.
- **Syntax-Aware Decorations**: Inline formatting is validated against CodeMirror's Markdown syntax tree so escaped or invalid Markdown is not decorated as active syntax.
- **Safe Table Rendering**: Table cells now use DOM nodes and text content instead of interpolated HTML, with validated clickable destinations.
- **Single Auto-Save Owner**: Controlled editors delegate persistence to their parent view, preventing duplicate task writes.

### Fixed
- **Concurrent Task Saves**: Task saves are serialized, and edits made during an in-flight save remain dirty until the newer draft is persisted.
- **Unsafe Live Preview Destinations**: Blocked executable and malformed URL schemes from Live Editor links and images.

## [1.8.0] - 2026-09-02

### Added
- **External Vault Synchronization**: Added a recursive, debounced vault watcher that refreshes notes, tasks, and synchronized workspace settings when files change outside the application.
- **Note Conflict Resolution**: Added an explicit choice between the local draft and the external file when another editor or cloud synchronization service changes a note with unsaved local edits.
- **Production Vault Service**: Extracted note path resolution, directory management, and note listing into a reusable service exercised directly by the verification suite.
- **Atomic Persistence Utility**: Added reusable atomic file replacement for notes, tasks, settings, vault configuration, and routine completion data.

### Changed
- **Queued Revision-Aware Auto-Save**: Note saving now tracks edit revisions and immediately persists newer edits made while an earlier write is still in progress.
- **Hardened Electron Boundary**: Enabled the Electron sandbox, restricted navigation and new windows, validated IPC dates and filenames, and confined file paths to their authorized directories.
- **Secure Markdown Rendering**: Raw Markdown HTML is now sanitized and renderer resources are restricted by a Content Security Policy.
- **Typed Preload Contracts**: Replaced loosely typed preload payloads with shared application domain types.
- **Lazy Main Views**: Daily, weekly, monthly, yearly, Kanban, and task views now load on demand, reducing the initial renderer bundle from approximately 1.96 MB to 554 KB uncompressed.
- **Parallel Application Startup**: Independent note, task, tag, routine, and active-note reads now initialize concurrently.
- **Shared Template Formatting**: Electron and the renderer now use the same production template formatter.

### Fixed
- **Edits During Auto-Save**: Fixed newer note edits being discarded or incorrectly marked as saved when a previous write was still running.
- **Partial File Writes**: Critical Markdown and JSON files are now written to temporary files and atomically renamed into place.
- **External File Overwrites**: External note changes no longer silently overwrite local drafts or get overwritten by stale in-memory content.
- **Path Traversal Protection**: Task filenames, note dates, and media paths can no longer escape their expected vault directories.
- **Markdown Translation Gaps**: Localized the remaining code-block labels and copy actions in English and Spanish.

### Testing
- Added direct production tests for path validation, bounded concurrency, atomic persistence, note resolution, and multi-year vault listing.
- Removed duplicated note-listing and path logic from the verification suite.

## [1.7.0] - 2026-09-02

### Added
- **Memory Diagnostics API**: Added runtime memory snapshots for the Electron main process and child processes through the secure preload bridge.
- **Reproducible Memory Benchmark**: Added `npm run benchmark:memory` with a configurable synthetic dataset to track task-list and period-report payload regressions.
- **Segmented Routine Completion Storage**: Moved daily routine completion history into yearly `.daily-worklogs/routine-completions/YYYY.json` files with legacy configuration migration.

### Changed
- **Task Metadata and Detail Separation**: Task listings now keep only lightweight metadata in application state and load Markdown content, frontmatter, raw content, and activity history when a task is opened.
- **On-Demand Full-Text Task Search**: Task body searches now execute through a debounced IPC operation without retaining every task description in the renderer.
- **Slim Period Reports**: Weekly, monthly, and yearly summaries now transfer only existing day metadata and lightweight task records. Daily Markdown content loads only when expanded, copied, or searched.
- **Deduplicated Refresh Pipeline**: Concurrent note and task refreshes now share in-flight requests, invalidate stale generations after writes, and discard obsolete period and note responses.
- **Scoped Zustand Subscriptions**: Migrated all store consumers to shallow field selectors to prevent unrelated components from rendering on every state update.
- **Lazy Global Modals**: Settings, task, routine-management, and onboarding modals now mount and load their code only while open.
- **Selective Settings Refreshes**: Appearance and routine changes no longer trigger unnecessary full note scans.

### Performance
- **Reduced Synthetic Task Payload**: The 10,000-task benchmark reduces the task-list payload from approximately 93.90 MiB to 2.52 MiB.
- **Reduced Synthetic Period Payload**: The benchmark reduces the period-report payload from approximately 191.12 MiB to 2.53 MiB.
- **Smaller Initial Renderer Bundle**: Lazy modal loading reduced the initial uncompressed renderer bundle by approximately 111 kB.

### Fixed
- **Out-of-Order Async Results**: Rapid date or period navigation can no longer replace current data with an older response.
- **Package Version Metadata**: Removed duplicate and stale package version declarations and synchronized release metadata.

## [1.6.0] - 2026-09-01

### Added
- **Unified Period Reports Structure**: Standardized headers across Weekly, Monthly, and Yearly views with unified period navigation controls (`[ < ] [ 📅 Period ] [ > ] [ This Period ]`), title styling, underline sub-navigation tabs (`Overview`, `Entries`, `Task breakdown`), and export actions.
- **Three-Card KPI Layout**: Standardized 3-card summary KPI grids across period views (`Days logged`, `Tasks completed`, `Completion rate`) with integrated comparison deltas against previous periods.
- **Slim Informational Month Banner**: Added a full-width notification banner in the monthly overview for newly started months.
- **Future Date Heatmap Indicators**: Enhanced the monthly activity calendar with dashed borders and dedicated legend indicator for future dates.
- **Neutral Future Week Placeholders**: Updated the 5-week progress breakdown to display future weeks as neutral dashed placeholders.
- **Previous-Year Comparison Line**: Added a subtle historical overlay line to the 12-month activity chart in the yearly summary.
- **Consistent Project & Status Charts**: Aligned donut charts with standardized taxonomy for status and project breakdowns.

### Changed
- **Worklog Application Branding**: Renamed app identity to "Worklog" and streamlined top bar navigation with compact segmented controls and active blue fill state.
- **Neutral Editor Background**: Neutralized CodeMirror editor background and gutters in dark mode to eliminate blue tint.
- **Desaturated Priority Colors**: Refined priority indicator palette in dashboard breakdowns for better visual balance.

### Fixed
- **Localized Date Formatting**: Corrected English month title formatting from `"September de 2026"` to `"September 2026"`.

## [1.5.0] - 2026-09-01

### Added
- **Segmented Time Navigation**: Replaced navigation text links with a unified segmented control (`Daily`, `Weekly`, `Monthly`, `Yearly`).
- **Visually Separated Tasks Action**: Added a distinct vertical separator and button styling for the Tasks board.
- **Neutral Dark & Modern Blue Theme**: Redesigned dark mode palette with neutral dark slate/zinc surfaces and modern blue accent highlights.
- **Friendlier Heading & Inline Code Badges**: Softer margins and border treatment for `# ` H1 headings, and polished inline code badges.

### Removed
- **Worklog Prefix in Header**: Removed the redundant `"Worklog:"` label before the navigation controls.
- **Duplicate Today Badge**: Removed redundant `[TODAY]` badge next to the date heading in the daily view.

### Changed
- **Compact Top-Bar**: Reduced header height from 54px to 44px for a sleeker desktop titlebar.

## [1.4.0] - 2026-09-01

### Added
- **Modernized Visual Design System**: Comprehensive UI redesign across all views with improved hierarchy, streamlined controls, and cohesive spacing.
- **Top Navigation Pill Header**: Redesigned header with `Worklog: [Día] [Semana] [Mes] [Año]` and `[Tareas]` pill buttons with active outline styling.
- **Underline Sub-Navigation Tabs**: Clean underline tabs (`[Resumen]`, `[Notas diarias]`, `[Desglose de tareas]`) for period overview views.
- **Monthly Dashboard Overhaul**: Integrated Mon–Sun heatmap calendar grid, 5-week vertical progress bar chart, status distribution donut chart, and key achievements feed.
- **Weekly Dashboard Overhaul**: 7-day activity visual strip with registered status indicators, project completion progress bars, and in-progress tasks breakdown with start & due dates.
- **Yearly Analytics Dashboard Overhaul**: 12-month activity bar chart, Area distribution donut chart, and priority breakdown.
- **Enhanced Kanban Task Cards**: Priority left accent borders, folder badges, task ID and relative date badges, tag overflow counters, and empty column states.

## [1.3.0] - 2026-09-01

### Added
- **Claude Theme & Aesthetic**: Modern warm clay/terracotta theme palette (`#da7756`) with refined warm backgrounds, typography, and card borders.
- **Claude Artifacts-Inspired Code Blocks**: Redesigned Markdown preview code containers with language headers, copy action, and syntax highlighting tokens.
- **Refined App Shell & Sidebar**: Polished sidebar layout with custom workspace badge, updated navigation segment controls, and active note highlights.

## [1.2.0] - 2026-08-25

### Added
- **Task Organization Model (Areas & Projects)**: Redesigned task management into permanent Areas of responsibility (services/domains) and finite, goal-oriented Projects.
- **Area Permanent Containers**: Long-term containers without artificial deadlines or completion percentages that define default tags, colors, and icons.
- **Finite Projects with Progress Tracking**: Goal-driven efforts within Areas featuring target dates, status lifecycle (*Active*, *Completed*, *On Hold*, *Archived*), and live progress bars based on completed tasks.
- **Automatic Context & Tag Inheritance**: Tasks assigned to an Area or Project automatically inherit context tags and properties without requiring manual prefixes in titles.
- **Automatic Sequential Task IDs**: Assigns unique, auto-incrementing GitHub-style task identifiers (e.g. `#1`, `#2`, `#12`) to every task with high-visibility badges on Kanban cards, period breakdowns, and editor headers with one-click clipboard copying.
- **Dedicated Fullscreen Task View**: Comprehensive task editing interface for managing titles, descriptions with full Markdown editing, priorities, due dates, statuses, and tags.
- **Yearly Worklog & Task Analytics View**: Dedicated annual tracking view summarizing total worklogs created, tasks completed, monthly activity distributions, deliverable progress, and direct navigation across any selected year.
- **Interactive Markdown Tag Autocompletion**: Live `#` tag autocomplete popover inside the daily note Markdown editor and task description editor displaying matching tags, color badges, and service/project details.
- **Areas & Projects Manager**: Dedicated management tab in Settings to create, customize, reorder, and archive Areas and Projects.
- **Tags & Labels Manager**: Dedicated settings tab to create, edit, rename, colorize, and delete custom tags.
- **Kanban Board Multi-View Navigation**: Area and Project switcher tabs, live progress indicators, and task card context badges.

### Removed
- **Calendar View & Tab**: Removed the standalone calendar tab and page to streamline top navigation across daily, weekly, monthly, yearly, and task views.

### Improved
- **Editor Canvas Note & Task Title**: Moved title editing from the sub-header bar into a seamless document title input directly at the top of the editor canvas.
- **Periodic Task Breakdown**: Enhanced weekly, monthly, and yearly overview reports to render task ID badges and Area/Project context tags.

## [1.1.0] - 2026-08-20

### Added
- **Cross-Computer Configuration Synchronization**: Workspace configuration (custom templates, Kanban columns, daily routines, routine completion history, date format, week start day, default template, editor font size, and theme preferences) is now automatically saved to and loaded from `.daily-worklogs/config.json` inside your vault folder.
- **Seamless Cloud Storage Multi-Device Support**: When opening a vault stored in iCloud Drive, Dropbox, Google Drive, OneDrive, or Syncthing on a different computer, the application automatically detects and loads the synced configuration, while safely preserving each machine's local directory path.
- **Automatic OS Dark/Light Theme Switching**: The application now seamlessly adapts in real-time when the operating system changes between dark and light modes (when Color Mode is set to "Auto" / system preference).
- **Electron Native Theme Synchronization**: Integrated Electron `nativeTheme.themeSource` with application settings to ensure native window frames, titlebars, menus, and web media queries align with system appearance.
- **Yearly Subfolder Organization**: Daily worklog markdown files are now organized and stored in dedicated subfolders by year (e.g. `2026/2026-08-20.md`) inside the vault.
- **Multi-Year Range Aggregation**: Full cross-year continuous aggregation and date range calculations in weekly, monthly, and calendar views.
- **Window Focus Auto-Refresh**: Automatically re-scans and synchronizes notes and tasks whenever the application window regains focus.
- **Resilient Note Resolution**: Backward-compatible scanner supporting notes stored in both year subfolders and vault root.

## [1.0.0] - 2026-08-20

### Added

#### Core Editor & Markdown
- **Live Markdown Editor**: Default Obsidian-like inline markdown editor with contextual formatting markers.
- **Editor Modes**: Tabbed interface supporting Live, Split, Code (CodeMirror 6), and Preview rendering modes.
- **Table Support**: GFM table rendering with cell alignment and interactive click-to-edit support.
- **Code Syntax Highlighting**: Syntax highlighting for code blocks with language parsing and copyable code cards.
- **Image Support & Vault Storage**: Drag-and-drop, clipboard paste, and image file picker with automatic local storage in the vault `images/` directory.
- **List & Bullet Styling**: Visual bullet point rendering and interactive markdown task lists.

#### Views & Note Navigation
- **Daily Worklogs**: Daily note creation button with customizable markdown templates and frontmatter metadata.
- **Daily Notes List**: Dedicated tab listing notes with real-time search and filter capabilities.
- **Weekly Executive View**: Aggregated read-only report view summarizing notes and activities for any selected week.
- **Monthly & Calendar Views**: Interactive calendar selector with period breakdown (day, week, month).
- **Note Actions**: Quick copy actions for daily notes and right-click context menu in sidebar with deletion confirmation.

#### Task Management & Kanban
- **Drag-and-Drop Kanban Board**: Visual workflow board for organizing and moving tasks between custom stages.
- **Custom Kanban Columns**: Configurable Kanban columns and column lifecycle behaviors managed via Settings.
- **Task Management**: Task modal editor with priorities, labels, and markdown descriptions.
- **Task Tracking in Reports**: Integrated task completion metrics in Weekly, Monthly, and Calendar overview screens.
- **Daily Routines Panel**: Independent daily checklist panel for recurring tasks without polluting daily worklogs.
- **Task Archive Toggle**: Option to automatically hide completed tasks older than 30 days with a toggle to inspect archived items.

#### Settings & Customization
- **Onboarding Wizard**: Guided first-time setup experience to configure storage location, language, and theme preferences.
- **Custom Vault Location**: User-selected storage directory on the local filesystem with open-in-folder actions.
- **Week Start Configuration**: Customizable first day of the week (Monday, Sunday, or any day).
- **Custom Date Formatting**: Locale-aware date display with customizable date format strings.
- **Custom Primary Theme Color**: Mantine palette generator allowing users to pick custom theme accent colors.
- **Report Exporter**: Export functionality for notes and aggregated worklogs.

#### Internationalization & Platform
- **Multi-Language Support**: Complete translations for English and Spanish with seamless in-app switching.
- **System Language Auto-Detection**: Automatically detects and matches OS language on initial launch.
- **Cross-Platform Support**: Packaged for macOS, Windows, and Linux with dedicated application icons and window styling.
- **About Dialog**: Native Electron about dialog and settings version runtime inspector.

---

### Fixed
- **View Synchronization**: Fixed weekly and monthly overview summaries failing to refresh when note lists change.
- **Preload Resolution**: Fixed Electron preload path resolution issues across development and production bundles.
- **File Manager Integration**: Fixed native file manager open handler when opening external directories.

---

### Improved
- **Header & Navigation**: Streamlined header by consolidating language and color scheme controls into the Settings modal.
- **Editor Tab Layout**: Redesigned editor tab bar with a compact layout preventing label wrapping on smaller screens.
- **Date Localization**: Enhanced calendar and period view headers to format dates according to the active locale and user format.
- **Build & Packaging**: Improved multi-platform build scripts, Electron preload bundling, and test verification suite.
