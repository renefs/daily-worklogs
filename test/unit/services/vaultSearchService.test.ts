import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { searchVault, invalidateVaultSearchCache, extractSnippet } from '../../../electron/services/vaultSearchService';

describe('vaultSearchService', () => {
  let testVault: string;

  beforeEach(() => {
    testVault = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-search-test-'));
    invalidateVaultSearchCache();
  });

  afterEach(() => {
    fs.rmSync(testVault, { recursive: true, force: true });
    invalidateVaultSearchCache();
  });

  it('finds notes matching content and provides snippets', async () => {
    const yearDir = path.join(testVault, '2026');
    fs.mkdirSync(yearDir, { recursive: true });
    fs.writeFileSync(
      path.join(yearDir, '2026-10-06.md'),
      '# 2026-10-06\n\nDiscussed architecture improvements with Alice.\n- [ ] Deploy auth service\n'
    );

    const results = await searchVault(testVault, 'Alice');
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('note');
    expect(results[0].id).toBe('2026-10-06');
    expect(results[0].snippet).toContain('Alice');
    expect(results[0].line).toBe(3);
  });

  it('finds tasks matching id, title, or body', async () => {
    const tasksDir = path.join(testVault, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(
      path.join(tasksDir, '2026-10-06-deploy-auth.md'),
      '---\nid: 42\ntitle: Deploy Auth Service\nstatus: in_progress\ntags: ["auth", "backend"]\n---\n\n## Implementation Details\nNeed to verify OAuth tokens and SSL certificates.\n'
    );

    const idResults = await searchVault(testVault, '#42');
    expect(idResults).toHaveLength(1);
    expect(idResults[0].type).toBe('task');
    expect(idResults[0].title).toBe('Deploy Auth Service');
    expect(idResults[0].taskId).toBe(42);

    const contentResults = await searchVault(testVault, 'OAuth');
    expect(contentResults).toHaveLength(1);
    expect(contentResults[0].type).toBe('task');
    expect(contentResults[0].snippet).toContain('OAuth tokens');
  });

  it('handles wikilink queries by stripping brackets [[...]]', async () => {
    const yearDir = path.join(testVault, '2026');
    fs.mkdirSync(yearDir, { recursive: true });
    fs.writeFileSync(
      path.join(yearDir, '2026-09-03.md'),
      '# 2026-09-03\n\nWorking on Live Secure Tokens for API authentication.\n'
    );

    // Searching date with brackets
    const dateResults = await searchVault(testVault, '[[2026-09-03]]');
    expect(dateResults).toHaveLength(1);
    expect(dateResults[0].id).toBe('2026-09-03');

    // Searching content phrase with brackets
    const phraseResults = await searchVault(testVault, '[[Live Secure Tokens]]');
    expect(phraseResults).toHaveLength(1);
    expect(phraseResults[0].id).toBe('2026-09-03');
    expect(phraseResults[0].snippet).toContain('Live Secure Tokens');
  });

  it('returns empty array when query is blank or no matches', async () => {
    const results = await searchVault(testVault, '   ');
    expect(results).toEqual([]);

    const noMatches = await searchVault(testVault, 'nonexistentTerm123');
    expect(noMatches).toEqual([]);
  });
  it('limits notes and tasks separately so many note matches never hide tasks', async () => {
    const yearDir = path.join(testVault, '2026');
    const tasksDir = path.join(testVault, 'tasks');
    fs.mkdirSync(yearDir, { recursive: true });
    fs.mkdirSync(tasksDir, { recursive: true });
    for (let day = 1; day <= 28; day++) {
      const date = `2026-02-${String(day).padStart(2, '0')}`;
      fs.writeFileSync(path.join(yearDir, `${date}.md`), `# ${date}\n\nWorked on billing.\n`);
    }
    fs.writeFileSync(path.join(tasksDir, 'billing.md'), '---\nid: 7\ntitle: Fix billing export\nstatus: todo\n---\n');

    const results = await searchVault(testVault, 'billing', { limitPerType: 5 });
    const notes = results.filter((r) => r.type === 'note');
    expect(notes).toHaveLength(5);
    expect(notes[0].id).toBe('2026-02-28');
    expect(results.filter((r) => r.type === 'task')).toHaveLength(1);

    const notesOnly = await searchVault(testVault, 'billing', { types: ['note'], limitPerType: Number.POSITIVE_INFINITY });
    expect(notesOnly).toHaveLength(28);
  });

  it('ignores frontmatter keys and ranks exact task ids and title matches first', async () => {
    const tasksDir = path.join(testVault, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, 'a.md'), '---\nid: 12\ntitle: Review docs\npriority: high\n---\nMention of cache here.\n');
    fs.writeFileSync(path.join(tasksDir, 'b.md'), '---\nid: 1\ntitle: Cache layer\npriority: low\n---\nBody.\n');

    expect(await searchVault(testVault, 'priority')).toEqual([]);

    const byTitle = await searchVault(testVault, 'cache');
    expect(byTitle.map((r) => r.taskId)).toEqual([1, 12]);

    const exactId = await searchVault(testVault, '#1');
    expect(exactId[0].taskId).toBe(1);
    expect(exactId.map((r) => r.taskId)).toContain(12);
  });

  it('clips long lines around the match', () => {
    const line = `${'a'.repeat(300)} needle ${'b'.repeat(300)}`;
    const { snippet, line: lineNumber } = extractSnippet(`intro\n${line}`, ['needle']);
    expect(lineNumber).toBe(2);
    expect(snippet).toContain('needle');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });

  it('prefers a line containing every query word', () => {
    const { line } = extractSnippet('alpha only\nbeta only\nalpha and beta', ['alpha', 'beta']);
    expect(line).toBe(3);
  });
});
