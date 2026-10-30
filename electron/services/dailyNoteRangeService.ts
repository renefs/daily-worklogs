import fsp from 'node:fs/promises';
import path from 'node:path';
import dayjs from 'dayjs';
import { ensureVaultDir, getYearFromDate } from './vaultService';
import { parseTaskCounts } from './taskFileService';
import { mapWithConcurrency } from '../utils/async';
import { hasWorkContent, stripNotesSection } from '../../src/utils/dailyNoteSections';

export interface DailyNoteRangeSummary {
  days: Array<{
    date: string;
    exists: true;
    tasksTotal: number;
    tasksCompleted: number;
    checklistItems: Array<{ date: string; text: string; completed: boolean }>;
  }>;
  totalTasks: number;
  completedTasks: number;
  activeDays: number;
  dailyChecklistItems: Array<{ date: string; text: string; completed: boolean }>;
}

function expandDateRange(startDate: string, endDate: string): string[] {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (!start.isValid() || !end.isValid() || start.isAfter(end, 'day')) return [];

  const dates: string[] = [];
  let current = start;
  while (!current.isAfter(end, 'day')) {
    dates.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }
  return dates;
}

async function resolveNoteFilesInRange(vaultPath: string, dates: string[]): Promise<Map<string, string>> {
  const listDir = async (directory: string): Promise<Set<string>> => {
    try {
      return new Set(await fsp.readdir(directory));
    } catch {
      return new Set<string>();
    }
  };

  const years = Array.from(new Set(dates.map(getYearFromDate)));
  const rootFiles = await listDir(vaultPath);
  const yearFiles = new Map<string, Set<string>>();
  await Promise.all(years.map(async (year) => {
    yearFiles.set(year, await listDir(path.join(vaultPath, year)));
  }));

  const paths = new Map<string, string>();
  for (const date of dates) {
    const filename = `${date}.md`;
    const year = getYearFromDate(date);
    if (yearFiles.get(year)?.has(filename)) {
      paths.set(date, path.join(vaultPath, year, filename));
    } else if (rootFiles.has(filename)) {
      paths.set(date, path.join(vaultPath, filename));
    }
  }
  return paths;
}

export async function summarizeDailyNotesInRange(
  vaultPath: string,
  startDate: string,
  endDate: string,
  concurrency: number,
  templateContent = ''
): Promise<DailyNoteRangeSummary> {
  ensureVaultDir(vaultPath);
  const rangeDates = expandDateRange(startDate, endDate);
  const noteFilePaths = await resolveNoteFilesInRange(vaultPath, rangeDates);
  const noteContents = await mapWithConcurrency(rangeDates, concurrency, async (date) => {
    const filepath = noteFilePaths.get(date);
    if (!filepath) return null;
    try {
      return await fsp.readFile(filepath, 'utf-8');
    } catch (error) {
      console.error(`Failed to read note for ${date}:`, error);
      return null;
    }
  });

  const summary: DailyNoteRangeSummary = {
    days: [],
    totalTasks: 0,
    completedTasks: 0,
    activeDays: 0,
    dailyChecklistItems: [],
  };
  for (let index = 0; index < rangeDates.length; index++) {
    const date = rangeDates[index];
    const rawContent = noteContents[index];
    if (rawContent === null) continue;
    const content = stripNotesSection(rawContent);
    if (!hasWorkContent(content, templateContent)) continue;

    const { tasksCompleted, tasksTotal } = parseTaskCounts(content);
    summary.totalTasks += tasksTotal;
    summary.completedTasks += tasksCompleted;
    summary.activeDays += 1;
    const checklistItems: DailyNoteRangeSummary['days'][number]['checklistItems'] = [];
    for (const line of content.split('\n')) {
      const match = line.match(/^[\s]*[-*]\s*\[([ xX])\]\s*(.+)$/);
      if (!match) continue;
      const text = match[2].trim();
      if (!text) continue;
      const item = { date, text, completed: match[1].toLowerCase() === 'x' };
      checklistItems.push(item);
      summary.dailyChecklistItems.push(item);
    }
    summary.days.push({ date, exists: true, tasksTotal, tasksCompleted, checklistItems });
  }
  return summary;
}
