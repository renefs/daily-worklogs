// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { atomicWriteFile, atomicWriteFileSync } from '../../../electron/utils/atomicFile';

describe('atomicFile utils', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes file synchronously without leaving temp files', () => {
    const targetPath = path.join(tempDir, 'sync-test.txt');
    atomicWriteFileSync(targetPath, 'initial content');

    expect(fs.existsSync(targetPath)).toBe(true);
    expect(fs.readFileSync(targetPath, 'utf-8')).toBe('initial content');

    // Verify no temporary files remain
    const tempFiles = fs.readdirSync(tempDir).filter((name) => name.endsWith('.tmp'));
    expect(tempFiles).toEqual([]);
  });

  it('writes file asynchronously and overwrites existing atomically', async () => {
    const targetPath = path.join(tempDir, 'async-test.txt');
    await atomicWriteFile(targetPath, 'first');
    expect(fs.readFileSync(targetPath, 'utf-8')).toBe('first');

    await atomicWriteFile(targetPath, 'second');
    expect(fs.readFileSync(targetPath, 'utf-8')).toBe('second');

    const tempFiles = fs.readdirSync(tempDir).filter((name) => name.endsWith('.tmp'));
    expect(tempFiles).toEqual([]);
  });
});

