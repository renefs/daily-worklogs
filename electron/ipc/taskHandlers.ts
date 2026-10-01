import { ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { TaskItem, TaskMeta, TaskWriteInput } from '../../src/types';
import { ensureTasksDir } from '../services/vaultService';
import { parseNumericTaskId, readTaskFiles, type TaskFileRead } from '../services/taskFileService';
import { requireTaskFilename, requireTaskWriteInput, resolvePathInside } from '../utils/security';

interface TaskHandlerDependencies {
  getVaultPath: () => string;
  ensureTasksHaveIds: (tasksDir: string) => Promise<void>;
  getMaxTaskId: (tasksDir: string) => Promise<number>;
  getColumnBehavior: (status: string) => string;
  slugify: (text: string) => string;
  writeInternalFile: (filepath: string, content: string) => Promise<void>;
  parseTaskFile: (filepath: string, filename: string) => Promise<TaskItem>;
  buildTaskMetadata: (read: TaskFileRead) => TaskMeta;
}

export function registerTaskHandlers(dependencies: TaskHandlerDependencies): void {
  const {
    getVaultPath,
    ensureTasksHaveIds,
    getMaxTaskId,
    getColumnBehavior,
    slugify,
    writeInternalFile,
    parseTaskFile,
    buildTaskMetadata,
  } = dependencies;

  ipcMain.handle('list-tasks', async () => {
    const tasksDir = ensureTasksDir(getVaultPath());
    try {
      await ensureTasksHaveIds(tasksDir);
      const tasks = (await readTaskFiles(tasksDir)).map(buildTaskMetadata);
      return tasks.sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || ''));
    } catch (error) {
      console.error('Error listing tasks:', error);
      return [];
    }
  });

  ipcMain.handle('search-task-contents', async (_event, rawQuery: unknown) => {
    const query = String(rawQuery || '').trim().toLocaleLowerCase();
    if (!query) return [];

    const tasksDir = ensureTasksDir(getVaultPath());
    const reads = await readTaskFiles(tasksDir);
    return reads.filter((read) => read.raw.toLocaleLowerCase().includes(query)).map((read) => read.filename);
  });

  ipcMain.handle('read-task', async (_event, filename: string) => {
    const tasksDir = ensureTasksDir(getVaultPath());
    const safeFilename = requireTaskFilename(filename);
    const filepath = resolvePathInside(tasksDir, safeFilename);
    return fs.existsSync(filepath) ? parseTaskFile(filepath, safeFilename) : null;
  });

  ipcMain.handle('write-task', async (_event, rawTaskData: unknown) => {
    const taskData: TaskWriteInput = requireTaskWriteInput(rawTaskData);
    const tasksDir = ensureTasksDir(getVaultPath());
    let filename = taskData.filename;

    if (!filename) {
      const slug = slugify(taskData.title) || 'task';
      const datePrefix = new Date().toISOString().split('T')[0];
      filename = `${datePrefix}-${slug}.md`;
      let counter = 1;
      while (fs.existsSync(path.join(tasksDir, filename))) {
        filename = `${datePrefix}-${slug}-${counter}.md`;
        counter++;
      }
    } else {
      filename = requireTaskFilename(filename);
    }

    const filepath = path.join(tasksDir, filename);
    let existingData: Record<string, any> = {};
    if (fs.existsSync(filepath)) {
      try {
        existingData = matter(fs.readFileSync(filepath, 'utf-8')).data || {};
      } catch (error) {
        console.warn('Could not read existing task frontmatter:', error);
      }
    }

    let taskId = parseNumericTaskId(taskData) || parseNumericTaskId(existingData);
    if (!taskId) taskId = (await getMaxTaskId(tasksDir)) + 1;

    const todayStr = new Date().toISOString().split('T')[0];
    const nextStatus = taskData.status || existingData.status || 'todo';
    const behavior = getColumnBehavior(nextStatus);
    const isDoneOrCancelled = behavior === 'done' || behavior === 'cancelled';
    const prevBehavior = existingData.status ? getColumnBehavior(existingData.status) : undefined;
    const wasDoneOrCancelled = prevBehavior === 'done' || prevBehavior === 'cancelled';

    let startedDate = taskData.startedDate !== undefined ? taskData.startedDate : existingData.startedDate;
    let completedDate = taskData.completedDate !== undefined ? taskData.completedDate : existingData.completedDate;
    if (behavior === 'in_progress' && !startedDate) startedDate = todayStr;
    if (isDoneOrCancelled && !completedDate) {
      completedDate = todayStr;
    } else if (!isDoneOrCancelled && taskData.completedDate === undefined && wasDoneOrCancelled) {
      completedDate = undefined;
    }

    const frontmatterData: Record<string, any> = {
      ...existingData,
      id: taskId,
      title: taskData.title,
      status: nextStatus,
      priority: taskData.priority || 'medium',
      created: taskData.created || existingData.created || todayStr,
      tags: Array.isArray(taskData.tags) ? taskData.tags : existingData.tags || [],
    };

    if (taskData.area !== undefined) {
      if (taskData.area.trim()) frontmatterData.area = taskData.area.trim();
      else delete frontmatterData.area;
    }
    if (taskData.project !== undefined) {
      if (taskData.project.trim()) frontmatterData.project = taskData.project.trim();
      else delete frontmatterData.project;
    }
    if (startedDate) frontmatterData.startedDate = startedDate;
    else delete frontmatterData.startedDate;
    if (completedDate) frontmatterData.completedDate = completedDate;
    else delete frontmatterData.completedDate;
    if (taskData.due) frontmatterData.due = taskData.due;
    else if ('due' in taskData && !taskData.due) delete frontmatterData.due;

    await writeInternalFile(filepath, matter.stringify(taskData.content, frontmatterData));
    return { success: true, task: await parseTaskFile(filepath, filename) };
  });

  ipcMain.handle('update-task-status', async (_event, filename: string, status: string) => {
    const tasksDir = ensureTasksDir(getVaultPath());
    const safeFilename = requireTaskFilename(filename);
    const filepath = resolvePathInside(tasksDir, safeFilename);
    if (!fs.existsSync(filepath)) return { success: false, error: 'Task file not found' };

    const parsed = matter(fs.readFileSync(filepath, 'utf-8'));
    const todayStr = new Date().toISOString().split('T')[0];
    const prevStatus = parsed.data.status || 'todo';
    const prevBehavior = getColumnBehavior(prevStatus);
    const nextBehavior = getColumnBehavior(status);
    const isDoneOrCancelled = nextBehavior === 'done' || nextBehavior === 'cancelled';
    const wasDoneOrCancelled = prevBehavior === 'done' || prevBehavior === 'cancelled';
    const updatedData: Record<string, any> = {
      ...parsed.data,
      status,
      updatedAt: new Date().toISOString(),
    };

    if (isDoneOrCancelled && !updatedData.completedDate) updatedData.completedDate = todayStr;
    else if (!isDoneOrCancelled && wasDoneOrCancelled) delete updatedData.completedDate;
    if (nextBehavior === 'in_progress' && !updatedData.startedDate) updatedData.startedDate = todayStr;

    await writeInternalFile(filepath, matter.stringify(parsed.content, updatedData));
    return { success: true, task: await parseTaskFile(filepath, safeFilename) };
  });

  ipcMain.handle('delete-task', async (_event, filename: string) => {
    const tasksDir = ensureTasksDir(getVaultPath());
    const safeFilename = requireTaskFilename(filename);
    const filepath = resolvePathInside(tasksDir, safeFilename);
    if (!fs.existsSync(filepath)) return { success: false };
    fs.unlinkSync(filepath);
    return { success: true };
  });
}
