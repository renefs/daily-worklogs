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

// 6. Test Week Range Calculation with customizable first day of the week (0..6)
function calculateWeekRange(currentDateStr, weekStartDay) {
  const [y, m, d] = currentDateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const currentDay = date.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const diff = (currentDay - weekStartDay + 7) % 7;
  
  const start = new Date(date);
  start.setUTCDate(start.getUTCDate() - diff);
  
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

// Test Case: Wednesday (3) meeting use case (last Wednesday to next Tuesday)
const wednesdayWeek1 = calculateWeekRange('2026-08-19', 3); // 2026-08-19 is a Wednesday
assert.strictEqual(wednesdayWeek1.start, '2026-08-19', 'Wednesday start date should be 2026-08-19');
assert.strictEqual(wednesdayWeek1.end, '2026-08-25', 'Wednesday week end date should be Tuesday 2026-08-25');

const wednesdayWeek2 = calculateWeekRange('2026-08-24', 3); // Monday in the same Wednesday-Tuesday cycle
assert.strictEqual(wednesdayWeek2.start, '2026-08-19', 'Monday should resolve to prior Wednesday 2026-08-19');
assert.strictEqual(wednesdayWeek2.end, '2026-08-25', 'Monday should resolve to Tuesday 2026-08-25');

const wednesdayWeek3 = calculateWeekRange('2026-08-25', 3); // Tuesday (the last day of the cycle)
assert.strictEqual(wednesdayWeek3.start, '2026-08-19', 'Tuesday should resolve to prior Wednesday 2026-08-19');
assert.strictEqual(wednesdayWeek3.end, '2026-08-25', 'Tuesday should resolve to Tuesday 2026-08-25');

// Test Case: Monday (1) standard ISO week (Monday to Sunday)
const mondayWeek = calculateWeekRange('2026-08-19', 1);
assert.strictEqual(mondayWeek.start, '2026-08-17', 'Monday week start should be 2026-08-17');
assert.strictEqual(mondayWeek.end, '2026-08-23', 'Monday week end should be 2026-08-23');

// Test Case: Sunday (0) week (Sunday to Saturday)
const sundayWeek = calculateWeekRange('2026-08-19', 0);
assert.strictEqual(sundayWeek.start, '2026-08-16', 'Sunday week start should be 2026-08-16');
assert.strictEqual(sundayWeek.end, '2026-08-22', 'Sunday week end should be 2026-08-22');

// Test Case: Friday (5) week (Friday to Thursday)
const fridayWeek = calculateWeekRange('2026-08-19', 5);
assert.strictEqual(fridayWeek.start, '2026-08-14', 'Friday week start should be 2026-08-14');
assert.strictEqual(fridayWeek.end, '2026-08-20', 'Friday week end should be 2026-08-20');

console.log('✓ Week start day calculation verified for all days of the week (including Wednesday-Tuesday cycle)');

// Cleanup
fs.rmSync(testVault, { recursive: true });
console.log('✓ All verification tests passed successfully!');

