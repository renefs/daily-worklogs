import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { searchVault, invalidateVaultSearchCache } from '../../../electron/services/vaultSearchService';

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
    expect(idResults[0].title).toContain('#42 Deploy Auth Service');

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
});
