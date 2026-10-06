import { ipcMain } from 'electron';
import fs from 'node:fs';
import type { AppSettings, TaskMeta } from '../../src/types';
 import { summarizeDailyNotesInRange } from '../services/dailyNoteRangeService';
import { ensureTasksDir } from '../services/vaultService';
import { readTaskFiles, buildTaskFromFile } from '../services/taskFileService';
import { getColumnBehavior } from '../services/settingsService';

interface ReportHandlerDependencies {
  getSettings: () => AppSettings;
  fileReadConcurrency: number;
}

export function registerReportHandlers(dependencies: ReportHandlerDependencies): void {
  const { getSettings, fileReadConcurrency } = dependencies;

  ipcMain.handle('get-notes-range', async (_event, startDate: string, endDate: string) => {
    const settings = getSettings();
    const vaultPath = settings.vaultPath;
    const dailySummary = await summarizeDailyNotesInRange(vaultPath, startDate, endDate, fileReadConcurrency);
    const { days, totalTasks: dailyTasksTotal, completedTasks: dailyTasksCompleted, activeDays, dailyChecklistItems } = dailySummary;
    let totalTasks = dailyTasksTotal;
    let completedTasks = dailyTasksCompleted;

    let periodTaskCount = 0;
    const completedTasksList: TaskMeta[] = [];
    const inProgressTasksList: TaskMeta[] = [];
    const waitingTasksList: TaskMeta[] = [];
    const backlogTasksList: TaskMeta[] = [];
    const tagBreakdown: Record<string, { total: number; completed: number; inProgress: number }> = {};
    const serviceBreakdown: Record<
      string,
      {
        service: string;
        total: number;
        completed: number;
        inProgress: number;
        projects: Record<string, { total: number; completed: number; inProgress: number }>;
      }
    > = {};
    const projectBreakdown: Record<
      string,
      {
        service: string;
        project: string;
        total: number;
        completed: number;
        inProgress: number;
      }
    > = {};

    const priorityBreakdown: Record<string, { total: number; completed: number }> = {
      urgent: { total: 0, completed: 0 },
      high: { total: 0, completed: 0 },
      medium: { total: 0, completed: 0 },
      low: { total: 0, completed: 0 },
    };

    const configuredTags: Array<{ name: string; service?: string; project?: string; color?: string }> =
      settings.tags || [];

    const resolveTagHierarchy = (rawTag: string) => {
      const trimmed = rawTag.trim();
      const match = configuredTags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
      if (match && (match.service || match.project)) {
        return {
          service: match.service || 'General',
          project: match.project || match.name,
        };
      }
      if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        const s = parts[0].trim();
        const p = parts.slice(1).join('/').trim();
        return {
          service: s ? s.charAt(0).toUpperCase() + s.slice(1) : 'General',
          project: p || trimmed,
        };
      }
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        const s = parts[0].trim();
        const p = parts.slice(1).join(':').trim();
        return {
          service: s ? s.charAt(0).toUpperCase() + s.slice(1) : 'General',
          project: p || trimmed,
        };
      }
      return {
        service: 'General',
        project: trimmed,
      };
    };

    try {
      const tasksDir = ensureTasksDir(vaultPath);
      if (fs.existsSync(tasksDir)) {
        const taskReads = await readTaskFiles(tasksDir, fileReadConcurrency);
        const taskMetadata = taskReads.map((read) =>
          buildTaskFromFile(read.filepath, read.filename, read.raw, read.stat, false)
        );
        for (const task of taskMetadata) {
          const createdDate = task.created || '';
          const dueDate = task.due || '';
          const startedDate = task.startedDate || '';
          const completedDate = task.completedDate || '';
          const modifiedDate = task.lastModified ? task.lastModified.split('T')[0] : '';

          const taskBehavior = getColumnBehavior(task.status, settings);
          const isDoneOrCancelled = taskBehavior === 'done' || taskBehavior === 'cancelled';
          const isInProgress = taskBehavior === 'in_progress';
          const wasCompletedInPeriod = completedDate >= startDate && completedDate <= endDate;
          const wasStartedInPeriod = startedDate >= startDate && startedDate <= endDate;
          const wasDueInPeriod = dueDate >= startDate && dueDate <= endDate;
          const wasCreatedInPeriod = createdDate >= startDate && createdDate <= endDate;
          const wasActiveInPeriod = startedDate && startedDate <= endDate && (!isDoneOrCancelled || (completedDate && completedDate >= startDate));
          const wasModifiedInPeriod = modifiedDate >= startDate && modifiedDate <= endDate;

          const inRange =
            wasCompletedInPeriod ||
            wasStartedInPeriod ||
            wasDueInPeriod ||
            wasCreatedInPeriod ||
            wasActiveInPeriod ||
            wasModifiedInPeriod;

          if (inRange) {
            periodTaskCount += 1;
            totalTasks += 1;
            if (isDoneOrCancelled) {
              completedTasks += 1;
            }

            if (taskBehavior === 'done' || taskBehavior === 'cancelled') {
              completedTasksList.push(task);
            } else if (taskBehavior === 'in_progress') {
              inProgressTasksList.push(task);
            } else if (taskBehavior === 'waiting') {
              waitingTasksList.push(task);
            } else {
              backlogTasksList.push(task);
            }

            if (task.tags && task.tags.length > 0) {
              for (const tag of task.tags) {
                if (!tagBreakdown[tag]) {
                  tagBreakdown[tag] = { total: 0, completed: 0, inProgress: 0 };
                }
                tagBreakdown[tag].total += 1;
                if (isDoneOrCancelled) {
                  tagBreakdown[tag].completed += 1;
                }
                if (isInProgress) {
                  tagBreakdown[tag].inProgress += 1;
                }
              }
            }

            let taskArea = task.area ? String(task.area).trim() : '';
            let taskProject = task.project ? String(task.project).trim() : '';

            if (!taskArea && task.tags && task.tags.length > 0) {
              for (const tag of task.tags) {
                const { service, project } = resolveTagHierarchy(tag);
                if (service && service !== 'General') {
                  taskArea = service;
                  if (!taskProject && project && project !== 'General' && project !== service) {
                    taskProject = project;
                  }
                  break;
                }
              }
            }

            if (!taskArea) {
              taskArea = 'General';
            }

            if (!serviceBreakdown[taskArea]) {
              serviceBreakdown[taskArea] = {
                service: taskArea,
                total: 0,
                completed: 0,
                inProgress: 0,
                projects: {},
              };
            }
            serviceBreakdown[taskArea].total += 1;
            if (isDoneOrCancelled) {
              serviceBreakdown[taskArea].completed += 1;
            }
            if (isInProgress) {
              serviceBreakdown[taskArea].inProgress += 1;
            }

            if (taskProject) {
              const projectKey = `${taskArea} / ${taskProject}`;
              if (!projectBreakdown[projectKey]) {
                projectBreakdown[projectKey] = {
                  service: taskArea,
                  project: taskProject,
                  total: 0,
                  completed: 0,
                  inProgress: 0,
                };
              }
              projectBreakdown[projectKey].total += 1;
              if (isDoneOrCancelled) {
                projectBreakdown[projectKey].completed += 1;
              }
              if (isInProgress) {
                projectBreakdown[projectKey].inProgress += 1;
              }
              if (!serviceBreakdown[taskArea].projects[taskProject]) {
                serviceBreakdown[taskArea].projects[taskProject] = {
                  total: 0,
                  completed: 0,
                  inProgress: 0,
                };
              }
              serviceBreakdown[taskArea].projects[taskProject].total += 1;
              if (isDoneOrCancelled) {
                serviceBreakdown[taskArea].projects[taskProject].completed += 1;
              }
              if (isInProgress) {
                serviceBreakdown[taskArea].projects[taskProject].inProgress += 1;
              }
            }

            const p = task.priority || 'medium';
            if (!priorityBreakdown[p]) {
              priorityBreakdown[p] = { total: 0, completed: 0 };
            }
            priorityBreakdown[p].total += 1;
            if (isDoneOrCancelled) {
              priorityBreakdown[p].completed += 1;
            }
          }
        }
      }
    } catch (err) {
      console.error('Error calculating tasks in range:', err);
    }

    return {
      startDate,
      endDate,
      title: `${startDate} to ${endDate}`,
      totalDays: days.length,
      activeDays,
      totalTasks,
      completedTasks,
      days,
      periodTaskCount,
      completedTasksList,
      inProgressTasksList,
      waitingTasksList,
      backlogTasksList,
      dailyChecklistItems,
      tagBreakdown,
      priorityBreakdown,
      serviceBreakdown,
      projectBreakdown,
    };
  });
}
