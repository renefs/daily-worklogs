import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

function temporaryPath(targetPath: string): string {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.${suffix}.tmp`);
}

export function atomicWriteFileSync(targetPath: string, content: string | NodeJS.ArrayBufferView): void {
  const tempPath = temporaryPath(targetPath);
  try {
    fs.writeFileSync(tempPath, content);
    fs.renameSync(tempPath, targetPath);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

export async function atomicWriteFile(targetPath: string, content: string | NodeJS.ArrayBufferView): Promise<void> {
  const tempPath = temporaryPath(targetPath);
  try {
    await fsp.writeFile(tempPath, content);
    await fsp.rename(tempPath, targetPath);
  } finally {
    await fsp.rm(tempPath, { force: true });
  }
}
