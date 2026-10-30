import { AreaDefinition, ProjectDefinition, TagDefinition, TaskMeta } from '../types';
import { DEFAULT_AREAS } from '../shared/defaultData';
import { getTagColor } from './tagUtils';

export { DEFAULT_AREAS };

export const AREA_COLOR_PALETTE = [
  'indigo',
  'teal',
  'violet',
  'blue',
  'cyan',
  'orange',
  'grape',
  'green',
  'red',
  'pink',
  'yellow',
  'lime',
];

/**
 * Returns color assigned to an area, checking configured areas first or hashing
 */
export function getAreaColor(areaName?: string, areas: AreaDefinition[] = []): string {
  if (!areaName) return 'gray';
  const clean = areaName.trim().toLowerCase();
  const match = areas.find((a) => a.name.toLowerCase() === clean);
  if (match && match.color) {
    return match.color;
  }
  const defaultMatch = DEFAULT_AREAS.find((a) => a.name.toLowerCase() === clean);
  if (defaultMatch && defaultMatch.color) {
    return defaultMatch.color;
  }
  return getTagColor(clean);
}

/**
 * Returns icon name assigned to an area
 */
export function getAreaIcon(areaName?: string, areas: AreaDefinition[] = []): string {
  if (!areaName) return 'folder';
  const clean = areaName.trim().toLowerCase();
  const match = areas.find((a) => a.name.toLowerCase() === clean);
  if (match && match.icon) {
    return match.icon;
  }
  const defaultMatch = DEFAULT_AREAS.find((a) => a.name.toLowerCase() === clean);
  if (defaultMatch && defaultMatch.icon) {
    return defaultMatch.icon;
  }
  return 'folder';
}

/**
 * Returns color for a project, falling back to parent area's color
 */
export function getProjectColor(
  projectName?: string,
  areaName?: string,
  projects: ProjectDefinition[] = [],
  areas: AreaDefinition[] = []
): string {
  if (!projectName) return 'gray';
  const cleanP = projectName.trim().toLowerCase();
  const cleanA = areaName ? areaName.trim().toLowerCase() : '';
  const match = projects.find((p) => {
    const sameName = p.name.toLowerCase() === cleanP;
    if (!sameName) return false;
    if (cleanA && p.areaName) {
      return p.areaName.toLowerCase() === cleanA;
    }
    return true;
  });
  if (match && match.color) {
    return match.color;
  }
  if (areaName) {
    return getAreaColor(areaName, areas);
  }
  return getTagColor(cleanP);
}

export interface ResolvedTaskContext {
  area: string;
  project?: string;
  isInheritedFromTag: boolean;
  areaDefinition?: AreaDefinition;
  projectDefinition?: ProjectDefinition;
  inheritedTags: string[];
  allEffectiveTags: string[];
}

/**
 * Resolves Area, Project and inherited tags for a Task
 */
export function resolveTaskContext(
  task: Partial<TaskMeta>,
  areas: AreaDefinition[] = [],
  projects: ProjectDefinition[] = [],
  _tagDefinitions: TagDefinition[] = []
): ResolvedTaskContext {
  let area = (task.area || '').trim();
  const project = (task.project || '').trim() || undefined;
  const isInheritedFromTag = false;

  if (!area) {
    area = 'General';
  }

  const cleanArea = area.toLowerCase();
  const areaDef =
    areas.find((a) => a.name.toLowerCase() === cleanArea) ||
    DEFAULT_AREAS.find((a) => a.name.toLowerCase() === cleanArea);

  const cleanProject = project ? project.toLowerCase() : '';
  const projectDef = cleanProject
    ? projects.find((p) => p.name.toLowerCase() === cleanProject && (!p.areaName || p.areaName.toLowerCase() === cleanArea))
    : undefined;

  // Inherited tags
  const inheritedTagsSet = new Set<string>();
  if (areaDef && areaDef.defaultTags) {
    areaDef.defaultTags.forEach((t) => {
      const cleanT = t.replace(/^#+/, '').trim();
      if (cleanT) inheritedTagsSet.add(cleanT);
    });
  }
  if (projectDef && projectDef.tags) {
    projectDef.tags.forEach((t) => {
      const cleanT = t.replace(/^#+/, '').trim();
      if (cleanT) inheritedTagsSet.add(cleanT);
    });
  }

  const explicitTags = Array.isArray(task.tags) ? task.tags.map((t) => String(t).replace(/^#+/, '').trim()).filter(Boolean) : [];
  const effectiveTagsSet = new Set<string>([...explicitTags, ...Array.from(inheritedTagsSet)]);

  // Inherited tags that are NOT in explicit tags
  const pureInherited = Array.from(inheritedTagsSet).filter((t) => !explicitTags.some((et) => et.toLowerCase() === t.toLowerCase()));

  return {
    area,
    project,
    isInheritedFromTag,
    areaDefinition: areaDef,
    projectDefinition: projectDef,
    inheritedTags: pureInherited,
    allEffectiveTags: Array.from(effectiveTagsSet),
  };
}

export interface ProjectProgressMetrics {
  total: number;
  completed: number;
  inProgress: number;
  waiting: number;
  backlog: number;
  percent: number;
  tasks: TaskMeta[];
}

/**
 * Calculates progress metrics for a Project with progress bar support
 */
export function calculateProjectProgress(
  projectName: string,
  areaName: string | undefined,
  tasks: TaskMeta[],
  areas: AreaDefinition[] = [],
  projects: ProjectDefinition[] = [],
  tagDefinitions: TagDefinition[] = [],
  behaviorMap?: Map<string, string>
): ProjectProgressMetrics {
  const cleanP = projectName.trim().toLowerCase();
  const cleanA = areaName ? areaName.trim().toLowerCase() : '';

  const projectTasks = tasks.filter((t) => {
    const ctx = resolveTaskContext(t, areas, projects, tagDefinitions);
    if (!ctx.project || ctx.project.toLowerCase() !== cleanP) return false;
    if (cleanA && ctx.area.toLowerCase() !== cleanA) return false;
    return true;
  });

  let completed = 0;
  let inProgress = 0;
  let waiting = 0;
  let backlog = 0;

  projectTasks.forEach((t) => {
    const behavior = behaviorMap?.get(t.status) || t.status;
    if (behavior === 'done' || behavior === 'cancelled') {
      completed += 1;
    } else if (behavior === 'in_progress') {
      inProgress += 1;
    } else if (behavior === 'waiting') {
      waiting += 1;
    } else {
      backlog += 1;
    }
  });

  const total = projectTasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    inProgress,
    waiting,
    backlog,
    percent,
    tasks: projectTasks,
  };
}

export interface AreaMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  directTasks: TaskMeta[];
  projectCount: number;
}

/**
 * Calculates metrics for an Area (Permanent container: NO progress bar percentage)
 */
export function calculateAreaMetrics(
  areaName: string,
  tasks: TaskMeta[],
  projects: ProjectDefinition[] = [],
  areas: AreaDefinition[] = [],
  tagDefinitions: TagDefinition[] = [],
  behaviorMap?: Map<string, string>
): AreaMetrics {
  const cleanA = areaName.trim().toLowerCase();

  const areaTasks = tasks.filter((t) => {
    const ctx = resolveTaskContext(t, areas, projects, tagDefinitions);
    return ctx.area.toLowerCase() === cleanA;
  });

  const directTasks = areaTasks.filter((t) => {
    const ctx = resolveTaskContext(t, areas, projects, tagDefinitions);
    return !ctx.project;
  });

  let completed = 0;
  let inProgress = 0;

  areaTasks.forEach((t) => {
    const behavior = behaviorMap?.get(t.status) || t.status;
    if (behavior === 'done' || behavior === 'cancelled') {
      completed += 1;
    } else if (behavior === 'in_progress') {
      inProgress += 1;
    }
  });

  const areaProjects = projects.filter((p) => (p.areaName || '').toLowerCase() === cleanA);

  return {
    totalTasks: areaTasks.length,
    completedTasks: completed,
    inProgressTasks: inProgress,
    directTasks,
    projectCount: areaProjects.length,
  };
}
