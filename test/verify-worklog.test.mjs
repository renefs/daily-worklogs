import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const testVault = path.join(os.tmpdir(), 'test-daily-worklog-vault');
if (fs.existsSync(testVault)) {
  fs.rmSync(testVault, { recursive: true });
}
fs.mkdirSync(testVault, { recursive: true });

console.log('--- Testing Daily Worklog Logic ---');

// 1. Create a sample daily note
const noteDate = '2026-08-18';
const noteContent = `# 2026-08-18 - Daily Worklog

## 🎯 Today's Goals & Priorities
- [x] Complete architecture review
- [x] Setup Mantine UI v7
- [ ] Write documentation

## ✅ Accomplishments
- Fixed IPC bridge security
- Added internationalization (English and Spanish)

## 🚧 Blockers & Notes
- None
`;

fs.writeFileSync(path.join(testVault, `${noteDate}.md`), noteContent, 'utf-8');

// 2. Parse tasks
const checked = (noteContent.match(/^[\s]*[-*]\s*\[[xX]\]/gm) || []).length;
const unchecked = (noteContent.match(/^[\s]*[-*]\s*\[\s\]/gm) || []).length;
assert.strictEqual(checked, 2, 'Should have 2 completed tasks');
assert.strictEqual(unchecked, 1, 'Should have 1 unchecked task');
console.log('✓ Task parsing verified: 2 completed, 1 unchecked (Total: 3)');

// 3. Create another note for weekly aggregation
const noteDate2 = '2026-08-19';
const noteContent2 = `# 2026-08-19 - Daily Worklog

## 🎯 Today's Goals
- [x] Release v1.0.0
- [x] Test weekly continuous report export
`;
fs.writeFileSync(path.join(testVault, `${noteDate2}.md`), noteContent2, 'utf-8');

// 4. Test note listing
const files = fs.readdirSync(testVault).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
assert.strictEqual(files.length, 2, 'Should find 2 note files');
console.log('✓ Note listing verified: found 2 files');

// 5. Test range aggregation (Weekly)
const start = new Date('2026-08-17');
const end = new Date('2026-08-23');
let totalTasks = 0;
let completedTasks = 0;
let activeDays = 0;

for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  const dateStr = d.toISOString().split('T')[0];
  const filepath = path.join(testVault, `${dateStr}.md`);
  if (fs.existsSync(filepath)) {
    activeDays++;
    const content = fs.readFileSync(filepath, 'utf-8');
    const c = (content.match(/^[\s]*[-*]\s*\[[xX]\]/gm) || []).length;
    const u = (content.match(/^[\s]*[-*]\s*\[\s\]/gm) || []).length;
    totalTasks += (c + u);
    completedTasks += c;
  }
}

assert.strictEqual(activeDays, 2, 'Active days should be 2');
assert.strictEqual(totalTasks, 5, 'Total tasks should be 5');
assert.strictEqual(completedTasks, 4, 'Completed tasks should be 4');
console.log('✓ Weekly range aggregation verified: 2 active days, 4/5 tasks completed (80%)');

// Cleanup
fs.rmSync(testVault, { recursive: true });
console.log('✓ All verification tests passed successfully!');
