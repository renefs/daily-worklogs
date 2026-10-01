import { ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { AppSettings } from '../../src/types';
import { formatTemplateContent } from '../../src/utils/dateTemplate';
import { listDailyNoteFiles } from '../services/vaultService';
import { parseTaskCounts } from '../services/taskFileService';
import { requireIsoDate } from '../utils/security';

interface NoteHandlerDependencies {
  getSettings: () => AppSettings;
  defaultTemplates: AppSettings['templates'];
  ensureVaultDir: (vaultPath: string) => void;
  ensureYearDir: (vaultPath: string, year: string) => string;
  getNoteFilePath: (vaultPath: string, date: string) => {
    filepath: string;
    exists: boolean;
    filename: string;
    relativePath: string;
  };
  getYearFromDate: (date: string) => string;
  writeInternalFile: (filepath: string, content: string) => Promise<void>;
  fileReadConcurrency: number;
}

export function registerNoteHandlers(dependencies: NoteHandlerDependencies): void {
  const {
    getSettings,
    defaultTemplates,
    ensureVaultDir,
    ensureYearDir,
    getNoteFilePath,
    getYearFromDate,
    writeInternalFile,
    fileReadConcurrency,
  } = dependencies;

  ipcMain.handle('read-note', async (_event, rawDate: string) => {
    const date = requireIsoDate(rawDate);
    const { vaultPath } = getSettings();
    ensureVaultDir(vaultPath);
    const { filepath, exists, filename, relativePath } = getNoteFilePath(vaultPath, date);

    if (exists) {
      const content = fs.readFileSync(filepath, 'utf-8');
      const stat = fs.statSync(filepath);
      const { tasksCompleted, tasksTotal } = parseTaskCounts(content);
      return {
        date, filename, filepath, relativePath, content, exists: true,
        lastModified: stat.mtime.toISOString(), tasksCompleted, tasksTotal,
      };
    }

    const settings = getSettings();
    const template = settings.templates.find((item) => item.id === settings.defaultTemplateId)
      || settings.templates[0]
      || defaultTemplates[0];
    const content = formatTemplateContent(template.content, date, settings.dateFormat, settings.language);
    return { date, filename, filepath, relativePath, content, exists: false, tasksCompleted: 0, tasksTotal: 0 };
  });

  ipcMain.handle('write-note', async (_event, rawDate: string, content: string) => {
    const date = requireIsoDate(rawDate);
    if (typeof content !== 'string') throw new Error('Invalid note content');
    const { vaultPath } = getSettings();
    const year = getYearFromDate(date);
    const yearDir = ensureYearDir(vaultPath, year);
    const filename = `${date}.md`;
    const filepath = path.join(yearDir, filename);
    await writeInternalFile(filepath, content);
    const stat = fs.statSync(filepath);
    return { success: true, filepath, relativePath: `${year}/${filename}`, lastModified: stat.mtime.toISOString() };
  });

  ipcMain.handle('delete-note', async (_event, rawDate: string) => {
    const date = requireIsoDate(rawDate);
    const { vaultPath } = getSettings();
    const year = getYearFromDate(date);
    const candidates = [path.join(vaultPath, year, `${date}.md`), path.join(vaultPath, `${date}.md`)];
    let deleted = false;
    for (const filepath of candidates) {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        deleted = true;
      }
    }
    return { success: deleted };
  });

  ipcMain.handle('list-notes', async () => {
    const { vaultPath } = getSettings();
    try {
      return await listDailyNoteFiles(vaultPath, fileReadConcurrency);
    } catch (error) {
      console.error('Error listing notes:', error);
      return [];
    }
  });
}
