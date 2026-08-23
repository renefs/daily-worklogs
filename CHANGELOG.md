# Changelog

All notable changes to the **Daily Worklog** application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [1.0.1] - 2026-08-20

### Added
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
