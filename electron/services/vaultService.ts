import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { mapWithConcurrency } from '../utils/async.ts';

export interface DailyNoteFile {
  date: string;
  filename: string;
  filepath: string;
  relativePath: string;
  lastModified: string;
  size: number;
}

export function ensureVaultDir(vaultPath: string): void {
  if (!fs.existsSync(vaultPath)) fs.mkdirSync(vaultPath, { recursive: true });
}

export function getYearFromDate(date: string): string {
  return date.match(/^(\d{4})/)?.[1] || new Date().getFullYear().toString();
}

export function ensureYearDir(vaultPath: string, year: string): string {
  ensureVaultDir(vaultPath);
  const yearDir = path.join(vaultPath, year);
  if (!fs.existsSync(yearDir)) fs.mkdirSync(yearDir, { recursive: true });
  return yearDir;
}

export function ensureTasksDir(vaultPath: string): string {
  ensureVaultDir(vaultPath);
  const tasksDir = path.join(vaultPath, 'tasks');
  if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });
  return tasksDir;
}

export function ensureImagesDir(vaultPath: string): string {
  ensureVaultDir(vaultPath);
  const imagesDir = path.join(vaultPath, 'images');
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  return imagesDir;
}

export function getNoteFilePath(vaultPath: string, date: string) {
  const year = getYearFromDate(date);
  const filename = `${date}.md`;
  const yearFilePath = path.join(vaultPath, year, filename);
  const rootFilePath = path.join(vaultPath, filename);
  const filepath = fs.existsSync(yearFilePath) ? yearFilePath : fs.existsSync(rootFilePath) ? rootFilePath : yearFilePath;
  return {
    filepath,
    exists: fs.existsSync(filepath),
    year,
    filename,
    relativePath: filepath === rootFilePath ? filename : `${year}/${filename}`,
  };
}

export async function listDailyNoteFiles(vaultPath: string, concurrency = 16): Promise<DailyNoteFile[]> {
  ensureVaultDir(vaultPath);
  const datePattern = /^\d{4}-\d{2}-\d{2}\.md$/;
  const rootEntries = await fsp.readdir(vaultPath, { withFileTypes: true });
  const candidates: Omit<DailyNoteFile, 'lastModified' | 'size'>[] = [];
  const seenDates = new Set<string>();

  for (const entry of rootEntries) {
    if (!entry.isDirectory() || !/^\d{4}$/.test(entry.name)) continue;
    const yearDir = path.join(vaultPath, entry.name);
    const entries = await fsp.readdir(yearDir, { withFileTypes: true }).catch(() => []);
    for (const file of entries) {
      if (!file.isFile() || !datePattern.test(file.name)) continue;
      const date = file.name.slice(0, -3);
      seenDates.add(date);
      candidates.push({ date, filename: file.name, filepath: path.join(yearDir, file.name), relativePath: `${entry.name}/${file.name}` });
    }
  }
  for (const entry of rootEntries) {
    if (!entry.isFile() || !datePattern.test(entry.name)) continue;
    const date = entry.name.slice(0, -3);
    if (!seenDates.has(date)) candidates.push({ date, filename: entry.name, filepath: path.join(vaultPath, entry.name), relativePath: entry.name });
  }

  const results = await mapWithConcurrency(candidates, concurrency, async (candidate) => {
    const stat = await fsp.stat(candidate.filepath);
    return { ...candidate, lastModified: stat.mtime.toISOString(), size: stat.size };
  });
  return results.sort((a, b) => b.date.localeCompare(a.date));
}
