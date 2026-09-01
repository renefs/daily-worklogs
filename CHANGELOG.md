# Changelog

All notable changes to the **Daily Worklog** application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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
