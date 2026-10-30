import type { AreaDefinition, DailyRoutine, ProjectDefinition } from '../types';

/**
 * Single source of truth for first-run workspace data. It is used by both the
 * Electron main process (seeding new installs) and the renderer (fallbacks).
 * Existing vaults are never affected: seeds only apply when a key is missing.
 */

export const DEFAULT_THEME_COLOR = 'indigo';

export const DEFAULT_AREAS: AreaDefinition[] = [
  {
    id: 'work',
    name: 'Work',
    color: 'blue',
    icon: 'briefcase',
    description: 'Day-to-day work, deliverables and responsibilities',
    defaultTags: [],
  },
  {
    id: 'general',
    name: 'General',
    color: 'gray',
    icon: 'folder',
    description: 'General administrative & miscellaneous tasks',
    defaultTags: [],
  },
];

export const DEFAULT_PROJECTS: ProjectDefinition[] = [];

export const DEFAULT_ROUTINES: DailyRoutine[] = [
  {
    id: 'routine-email',
    title: 'Check Email & Messages',
    description: 'Review inbox and team chat channels',
    url: '',
    schedule: 'weekdays',
    enabled: true,
  },
  {
    id: 'routine-calendar',
    title: 'Check Calendar & Schedule',
    description: 'Review meetings and agenda for today',
    url: '',
    schedule: 'weekdays',
    enabled: true,
  },
  {
    id: 'routine-monitoring',
    title: 'Check System Status & Monitoring',
    description: 'Verify server health, alerts and dashboards',
    url: 'https://uptimerobot.com',
    schedule: 'everyday',
    enabled: true,
  },
];
