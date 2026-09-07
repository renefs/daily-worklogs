// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  ensureYearDir,
  ensureTasksDir,
  ensureImagesDir,
  getNoteFilePath,
  getYearFromDate,
  listDailyNoteFiles,
} from '../../../electron/services/vaultService';

describe('vaultService', () => {
  let testVault: string;

  beforeEach(() => {
    testVault = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-test-'));
  });

  afterEach(() => {
    fs.rmSync(testVault, { recursive: true, force: true });
  });

  it('extracts year from ISO date accurately', () => {
    expect(getYearFromDate('2026-09-07')).toBe('2026');
    expect(getYearFromDate('1999-12-31')).toBe('1999');
  });

  it('ensures year, tasks, and images directories exist', () => {
    const yearDir = ensureYearDir(testVault, '2026');
    const tasksDir = ensureTasksDir(testVault);
    const imagesDir = ensureImagesDir(testVault);

    expect(fs.existsSync(yearDir)).toBe(true);
    expect(fs.existsSync(tasksDir)).toBe(true);
    expect(fs.existsSync(imagesDir)).toBe(true);
  });

  it('resolves note filepath in yearly subdirectory and checks existence', () => {
    const { filepath, exists } = getNoteFilePath(testVault, '2026-08-20');
    expect(filepath).toBe(path.join(testVault, '2026', '2026-08-20.md'));
    expect(exists).toBe(false);

    ensureYearDir(testVault, '2026');
    fs.writeFileSync(filepath, '# Test Note', 'utf-8');

    const checkAgain = getNoteFilePath(testVault, '2026-08-20');
    expect(checkAgain.exists).toBe(true);
  });

  it('lists daily note files across multiple years in descending chronological order', async () => {
    const y2026 = ensureYearDir(testVault, '2026');
    const y2025 = ensureYearDir(testVault, '2025');
    const y2024 = ensureYearDir(testVault, '2024');

    fs.writeFileSync(path.join(y2026, '2026-08-19.md'), '# 2026-08-19');
    fs.writeFileSync(path.join(y2026, '2026-08-18.md'), '# 2026-08-18');
    fs.writeFileSync(path.join(y2025, '2025-12-31.md'), '# 2025-12-31');
    fs.writeFileSync(path.join(y2024, '2024-06-15.md'), '# 2024-06-15');

    const listed = await listDailyNoteFiles(testVault);
    expect(listed.length).toBe(4);
    expect(listed[0].date).toBe('2026-08-19');
    expect(listed[0].relativePath).toBe('2026/2026-08-19.md');
    expect(listed[3].date).toBe('2024-06-15');
    expect(listed[3].relativePath).toBe('2024/2024-06-15.md');
  });
});

