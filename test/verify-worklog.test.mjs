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

// 7. Test Table Parsing and Alignments
function splitTableRow(rowStr) {
  let trimmed = rowStr.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  const cells = [];
  let current = '';
  let escaped = false;
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '\\' && !escaped) {
      escaped = true;
      current += char;
    } else if (char === '|' && !escaped) {
      cells.push(current.trim());
      current = '';
    } else {
      escaped = false;
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseDelimiterRow(delimiterStr) {
  const cells = splitTableRow(delimiterStr);
  if (cells.length === 0) return null;
  const alignments = [];
  for (const cell of cells) {
    const match = cell.trim().match(/^(:?)-+(:?)$/);
    if (!match) return null;
    const leftColon = match[1] === ':';
    const rightColon = match[2] === ':';
    if (leftColon && rightColon) alignments.push('center');
    else if (rightColon) alignments.push('right');
    else if (leftColon) alignments.push('left');
    else alignments.push(undefined);
  }
  return alignments;
}

const tableSample = `| Item | Description | Status |
| :--- | :---: | ---: |
| Task 1 | Details | Done |
| Task 2 | Details | Pending |`;

const lines = tableSample.split('\n');
const headers = splitTableRow(lines[0]);
const alignments = parseDelimiterRow(lines[1]);
const row1 = splitTableRow(lines[2]);
const row2 = splitTableRow(lines[3]);

assert.deepStrictEqual(headers, ['Item', 'Description', 'Status'], 'Headers match');
assert.deepStrictEqual(alignments, ['left', 'center', 'right'], 'Alignments match');
assert.deepStrictEqual(row1, ['Task 1', 'Details', 'Done'], 'Row 1 matches');
assert.deepStrictEqual(row2, ['Task 2', 'Details', 'Pending'], 'Row 2 matches');
console.log('✓ Markdown Table parsing and alignments verified');

// 8. Test Bullet Point, Task List, and Ordered List Parsing
const taskRegex = /^([ \t]*)([-*+]\s+)\[([ xX])\](\s*.*)$/;
const bulletRegex = /^([ \t]*)([-*+])([ \t]+)(.*)$/;
const orderedRegex = /^([ \t]*)(\d+)(\.)([ \t]+)(.*)$/;

// Test bullet detection
const bulletLine1 = '- Regular bullet item';
const bulletLine2 = '  * Nested bullet item';
const bulletLine3 = '    + Deep nested bullet item';
const taskLine1 = '- [ ] Unchecked task';
const taskLine2 = '  * [x] Checked task';
const orderedLine = '1. Numbered item';

assert.ok(!taskRegex.test(bulletLine1), 'Bullet 1 is not a task');
assert.ok(bulletRegex.test(bulletLine1), 'Bullet 1 is a bullet');
const bMatch1 = bulletLine1.match(bulletRegex);
assert.strictEqual(Math.floor(bMatch1[1].length / 2), 0, 'Bullet 1 level is 0');

assert.ok(bulletRegex.test(bulletLine2), 'Bullet 2 is a bullet');
const bMatch2 = bulletLine2.match(bulletRegex);
assert.strictEqual(Math.floor(bMatch2[1].length / 2), 1, 'Bullet 2 level is 1');

assert.ok(bulletRegex.test(bulletLine3), 'Bullet 3 is a bullet');
const bMatch3 = bulletLine3.match(bulletRegex);
assert.strictEqual(Math.floor(bMatch3[1].length / 2), 2, 'Bullet 3 level is 2');

assert.ok(taskRegex.test(taskLine1), 'Task 1 is a task');
assert.ok(taskRegex.test(taskLine2), 'Task 2 is a task');
assert.ok(orderedRegex.test(orderedLine), 'Ordered item matched');
console.log('✓ Bullet points, nested levels, and ordered list regex verification passed');

// 9. Test Code Block (``` code ```) and Inline Code (`code`) Parsing
const codeBlockRegex = /^([ \t]*)(```+|~~~+)(.*)$/;
const inlineCodeRegex = /`([^`\n]+)`/g;

// Test code block opening fences
const fence1 = '```javascript';
const fence2 = '```python';
const fence3 = '~~~bash';
const fence4 = '```';

assert.ok(codeBlockRegex.test(fence1), 'JS fence matched');
const match1 = fence1.match(codeBlockRegex);
assert.strictEqual(match1[3].trim(), 'javascript', 'Language is javascript');

assert.ok(codeBlockRegex.test(fence2), 'Python fence matched');
const match2 = fence2.match(codeBlockRegex);
assert.strictEqual(match2[3].trim(), 'python', 'Language is python');

assert.ok(codeBlockRegex.test(fence3), 'Tilde fence matched');
const match3 = fence3.match(codeBlockRegex);
assert.strictEqual(match3[2], '~~~', 'Fence marker is ~~~');
assert.strictEqual(match3[3].trim(), 'bash', 'Language is bash');

// Test inline code extraction
const sampleInline = 'Run `npm install` and then `npm run dev` to start.';
const inlineMatches = [];
let m;
while ((m = inlineCodeRegex.exec(sampleInline)) !== null) {
  inlineMatches.push(m[1]);
}
assert.deepStrictEqual(inlineMatches, ['npm install', 'npm run dev'], 'Extracted inline code correctly');
console.log('✓ Code blocks (fenced) and inline code regex verification passed');

// 10. Test Localized Template Date Formatting & Custom {{date}} Format
import dayjs from 'dayjs';
import 'dayjs/locale/es.js';
import 'dayjs/locale/en.js';

function formatTemplateDate(dateStr, format, lang) {
  const targetLang = lang === 'es' ? 'es' : 'en';
  const targetFormat = format && format.trim() ? format.trim() : 'YYYY-MM-DD';
  try {
    const d = dayjs(dateStr).locale(targetLang);
    if (!d.isValid()) return dateStr;
    return d.format(targetFormat);
  } catch {
    return dateStr;
  }
}

function formatTemplateContent(content, dateStr, dateFormat, lang) {
  if (!content) return '';
  const targetLang = lang === 'es' ? 'es' : 'en';
  const defaultFormat = dateFormat && dateFormat.trim() ? dateFormat.trim() : 'YYYY-MM-DD';

  let processed = content.replace(/\{\{date:([^}]+)\}\}/g, (_match, customFmt) => {
    return formatTemplateDate(dateStr, customFmt.trim(), targetLang);
  });

  processed = processed.replace(/\{\{date\}\}/g, () => {
    return formatTemplateDate(dateStr, defaultFormat, targetLang);
  });

  return processed;
}

const testDate = '2026-08-20'; // A Thursday in August 2026

// Test 10.1: Default format
const template1 = '# {{date}} - Daily Worklog';
const out1 = formatTemplateContent(template1, testDate, 'YYYY-MM-DD', 'en');
assert.strictEqual(out1, '# 2026-08-20 - Daily Worklog', 'Default format produces ISO date');

// Test 10.2: Full localized date in English
const out2 = formatTemplateContent(template1, testDate, 'dddd, MMMM D, YYYY', 'en');
assert.strictEqual(out2, '# Thursday, August 20, 2026 - Daily Worklog', 'Full English date format matched');

// Test 10.3: Full localized date in Spanish
const out3 = formatTemplateContent(template1, testDate, 'dddd, D [de] MMMM [de] YYYY', 'es');
assert.strictEqual(out3, '# jueves, 20 de agosto de 2026 - Daily Worklog', 'Full Spanish date format matched');

// Test 10.4: Custom format (DD/MM/YYYY)
const out4 = formatTemplateContent(template1, testDate, 'DD/MM/YYYY', 'en');
assert.strictEqual(out4, '# 20/08/2026 - Daily Worklog', 'Custom DD/MM/YYYY matched');

// Test 10.5: Inline custom date token {{date:FORMAT}}
const templateWithInline = '# Standup {{date:YYYY/MM/DD}} ({{date:dddd}})\nLogged on {{date}}';
const out5 = formatTemplateContent(templateWithInline, testDate, 'DD/MM/YYYY', 'es');
assert.strictEqual(
  out5,
  '# Standup 2026/08/20 (jueves)\nLogged on 20/08/2026',
  'Inline custom date tokens and global template format resolve together'
);
console.log('✓ Localized template date formatting and custom {{date}} format tests passed');

// 11. Test Image Markdown Parsing and Unique Filename Generation
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateUniqueImageFilename(imagesDir, originalName, mimeType) {
  let ext = '.png';
  if (originalName) {
    const candidateExt = path.extname(originalName).toLowerCase();
    if (candidateExt && candidateExt.length <= 6) {
      ext = candidateExt;
    }
  } else if (mimeType) {
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
    else if (mimeType.includes('gif')) ext = '.gif';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('svg')) ext = '.svg';
  }

  const baseRaw = originalName ? path.basename(originalName, path.extname(originalName)) : 'image';
  const cleanBase = slugify(baseRaw) || 'image';
  const timestamp = '20260820-140000';

  let filename = `${cleanBase}-${timestamp}${ext}`;
  let counter = 1;
  while (fs.existsSync(path.join(imagesDir, filename))) {
    filename = `${cleanBase}-${timestamp}-${counter}${ext}`;
    counter++;
  }
  return filename;
}

const testImagesDir = path.join(testVault, 'images');
fs.mkdirSync(testImagesDir, { recursive: true });

// Test 11.1: Image filename generation
const img1 = generateUniqueImageFilename(testImagesDir, 'My Screenshot (1).png');
assert.strictEqual(img1, 'my-screenshot-1-20260820-140000.png', 'Slugified filename matched');
fs.writeFileSync(path.join(testImagesDir, img1), 'fake-png-bytes');

// Test 11.2: Image filename collision deduplication
const img2 = generateUniqueImageFilename(testImagesDir, 'My Screenshot (1).png');
assert.strictEqual(img2, 'my-screenshot-1-20260820-140000-1.png', 'Collision appended counter');

// Test 11.3: Markdown Image token regex matching
const sampleMarkdownWithImages = `# Notes
Here is an image: ![App Screenshot](images/${img1})
And a link: [Google](https://google.com)
`;
const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
const imageMatches = [...sampleMarkdownWithImages.matchAll(imageRegex)];
assert.strictEqual(imageMatches.length, 1, 'Should match exactly 1 image');
assert.strictEqual(imageMatches[0][1], 'App Screenshot', 'Image alt text matched');
assert.strictEqual(imageMatches[0][2], `images/${img1}`, 'Image path matched');

// Test 11.4: Resolve relative image path to custom protocol
function resolveMediaUrl(relativeOrAbsPath) {
  if (!relativeOrAbsPath) return '';
  if (/^https?:\/\//i.test(relativeOrAbsPath) || relativeOrAbsPath.startsWith('data:') || relativeOrAbsPath.startsWith('worklog-media://')) {
    return relativeOrAbsPath;
  }
  const clean = relativeOrAbsPath.replace(/^\.?\/+/, '');
  return `worklog-media://vault/${clean}`;
}

assert.strictEqual(resolveMediaUrl(`images/${img1}`), `worklog-media://vault/images/${img1}`);
assert.strictEqual(resolveMediaUrl(`./images/${img1}`), `worklog-media://vault/images/${img1}`);
assert.strictEqual(resolveMediaUrl(`https://example.com/img.png`), `https://example.com/img.png`);
console.log('✓ Image markdown parsing and storage logic tests passed');

// Cleanup
fs.rmSync(testVault, { recursive: true });
console.log('✓ All verification tests passed successfully!');




