import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import matter from 'gray-matter';

const testVault = path.join(os.tmpdir(), 'test-daily-worklog-vault');
if (fs.existsSync(testVault)) {
  fs.rmSync(testVault, { recursive: true });
}
fs.mkdirSync(testVault, { recursive: true });

console.log('--- Testing Daily Worklog Logic ---');

// Year helper functions under test
function getYearFromDate(date) {
  const match = date.match(/^(\d{4})/);
  if (match) return match[1];
  return new Date().getFullYear().toString();
}

function ensureYearDir(vaultPath, year) {
  const yearDir = path.join(vaultPath, year);
  if (!fs.existsSync(yearDir)) {
    fs.mkdirSync(yearDir, { recursive: true });
  }
  return yearDir;
}

function getNoteFilePath(vaultPath, date) {
  const year = getYearFromDate(date);
  const filename = `${date}.md`;
  const filepath = path.join(vaultPath, year, filename);

  return {
    filepath,
    exists: fs.existsSync(filepath),
    year,
    filename,
    relativePath: `${year}/${filename}`,
  };
}

function listNotes(vaultPath) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}\.md$/;
  const noteFiles = [];
  const rootEntries = fs.readdirSync(vaultPath, { withFileTypes: true });

  for (const entry of rootEntries) {
    if (entry.isDirectory() && /^\d{4}$/.test(entry.name)) {
      const yearDir = path.join(vaultPath, entry.name);
      try {
        const yearFiles = fs.readdirSync(yearDir, { withFileTypes: true });
        for (const yearFile of yearFiles) {
          if (yearFile.isFile() && dateRegex.test(yearFile.name)) {
            const filepath = path.join(yearDir, yearFile.name);
            const stat = fs.statSync(filepath);
            const date = yearFile.name.replace('.md', '');
            noteFiles.push({
              date,
              filename: yearFile.name,
              filepath,
              relativePath: `${entry.name}/${yearFile.name}`,
              lastModified: stat.mtime.toISOString(),
              size: stat.size,
            });
          }
        }
      } catch (err) {
        console.warn('Error reading year dir:', err);
      }
    }
  }

  return noteFiles.sort((a, b) => b.date.localeCompare(a.date));
}

// 1. Create a sample daily note in 2026 subfolder
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

const year2026Dir = ensureYearDir(testVault, '2026');
fs.writeFileSync(path.join(year2026Dir, `${noteDate}.md`), noteContent, 'utf-8');

// 2. Parse tasks
const checked = (noteContent.match(/^[\s]*[-*]\s*\[[xX]\]/gm) || []).length;
const unchecked = (noteContent.match(/^[\s]*[-*]\s*\[\s\]/gm) || []).length;
assert.strictEqual(checked, 2, 'Should have 2 completed tasks');
assert.strictEqual(unchecked, 1, 'Should have 1 unchecked task');
console.log('✓ Task parsing verified: 2 completed, 1 unchecked (Total: 3)');

// 3. Create another note in 2026 subfolder
const noteDate2 = '2026-08-19';
const noteContent2 = `# 2026-08-19 - Daily Worklog

## 🎯 Today's Goals
- [x] Release v1.0.0
- [x] Test weekly continuous report export
`;
fs.writeFileSync(path.join(year2026Dir, `${noteDate2}.md`), noteContent2, 'utf-8');

// 3b. Create a note in 2025 and 2024 subfolders
const year2025Dir = ensureYearDir(testVault, '2025');
const year2024Dir = ensureYearDir(testVault, '2024');
fs.writeFileSync(path.join(year2025Dir, '2025-12-31.md'), '# 2025-12-31 - New Year Eve\n- [x] End of year review', 'utf-8');
fs.writeFileSync(path.join(year2024Dir, '2024-06-15.md'), '# 2024-06-15 - Mid Year Note\n- [x] Past task', 'utf-8');

// 4. Test note listing strictly across year directories
const listedNotes = listNotes(testVault);
assert.strictEqual(listedNotes.length, 4, 'Should find 4 note files in year subfolders');
assert.strictEqual(listedNotes[0].date, '2026-08-19', 'Latest note should be 2026-08-19');
assert.strictEqual(listedNotes[0].relativePath, '2026/2026-08-19.md', 'Relative path should include year');
assert.strictEqual(listedNotes[3].date, '2024-06-15', 'Oldest note should be 2024-06-15');
assert.strictEqual(listedNotes[3].relativePath, '2024/2024-06-15.md', 'Relative path should be in 2024');
console.log('✓ Multi-year note listing verified: found 4 files across 2026, 2025, and 2024 subfolders');

// 5. Test range aggregation (Weekly across 2026)
const start = new Date('2026-08-17');
const end = new Date('2026-08-23');
let totalTasks = 0;
let completedTasks = 0;
let activeDays = 0;

for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  const dateStr = d.toISOString().split('T')[0];
  const { filepath, exists } = getNoteFilePath(testVault, dateStr);
  if (exists) {
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

// 5b. Test Range Aggregation across Year Boundary (2025-12-29 to 2026-01-04)
fs.writeFileSync(path.join(year2026Dir, '2026-01-01.md'), '# 2026-01-01\n- [x] New Year Day task', 'utf-8');
const yearCrossStart = new Date('2025-12-29');
const yearCrossEnd = new Date('2026-01-04');
let yearCrossDays = 0;
let yearCrossTasks = 0;

for (let d = new Date(yearCrossStart); d <= yearCrossEnd; d.setDate(d.getDate() + 1)) {
  const dateStr = d.toISOString().split('T')[0];
  const { filepath, exists } = getNoteFilePath(testVault, dateStr);
  if (exists) {
    yearCrossDays++;
    const content = fs.readFileSync(filepath, 'utf-8');
    const c = (content.match(/^[\s]*[-*]\s*\[[xX]\]/gm) || []).length;
    yearCrossTasks += c;
  }
}

assert.strictEqual(yearCrossDays, 2, 'Should find 2025-12-31 and 2026-01-01');
assert.strictEqual(yearCrossTasks, 2, 'Should aggregate tasks across 2025 and 2026');
console.log('✓ Year boundary cross aggregation verified (2025 -> 2026)');

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

// 12. Test Onboarding Logic & Settings State
const initialSettings = {
  vaultPath: '/mock/vault',
  language: 'en',
  themeColor: 'indigo',
  colorScheme: 'auto',
  weekStartDay: 1,
  autoSave: true,
  hasCompletedOnboarding: false,
};

assert.strictEqual(initialSettings.hasCompletedOnboarding, false, 'New install hasCompletedOnboarding should be false');

function completeOnboardingState(current, updates) {
  return {
    ...current,
    ...(updates || {}),
    hasCompletedOnboarding: true,
  };
}

const configuredSettings = completeOnboardingState(initialSettings, {
  language: 'es',
  weekStartDay: 0,
  themeColor: 'teal',
  autoSave: true,
});

assert.strictEqual(configuredSettings.hasCompletedOnboarding, true, 'hasCompletedOnboarding is true after completion');
assert.strictEqual(configuredSettings.language, 'es', 'Language is updated');
assert.strictEqual(configuredSettings.weekStartDay, 0, 'Week start day is updated');
assert.strictEqual(configuredSettings.themeColor, 'teal', 'Theme color is updated');
console.log('✓ Onboarding wizard state transitions and settings persistence logic tests passed');

// 13. Test App Version & Info Configuration
const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
assert.strictEqual(pkg.version, '1.5.0', 'Package version should be 1.5.0');
assert.strictEqual(pkg.version, '1.6.0', 'Package version should be 1.6.0');
assert.strictEqual(pkg.name, 'daily-worklog', 'Package name should be daily-worklog');
console.log('✓ App version 1.5.0 verification tests passed');
console.log('✓ App version 1.6.0 verification tests passed');

// 14. Test Automatic Dark/Light Mode & System Theme Synchronization Logic
function computeEffectiveColorScheme(configuredScheme, systemPreference) {
  if (configuredScheme === 'auto') {
    return systemPreference;
  }
  return configuredScheme;
}

function resolveElectronThemeSource(configuredScheme) {
  return configuredScheme === 'auto' ? 'system' : configuredScheme;
}

// When configured to 'auto', app automatically adapts to system theme transitions
assert.strictEqual(
  computeEffectiveColorScheme('auto', 'dark'),
  'dark',
  'When system is dark, auto mode should resolve to dark'
);
assert.strictEqual(
  computeEffectiveColorScheme('auto', 'light'),
  'light',
  'When system is light, auto mode should resolve to light'
);

// When explicitly set to 'light' or 'dark', it respects user preference regardless of OS theme
assert.strictEqual(
  computeEffectiveColorScheme('light', 'dark'),
  'light',
  'Explicit light mode stays light even if system is dark'
);
assert.strictEqual(
  computeEffectiveColorScheme('dark', 'light'),
  'dark',
  'Explicit dark mode stays dark even if system is light'
);

// Electron themeSource mapping
assert.strictEqual(resolveElectronThemeSource('auto'), 'system', 'auto maps to electron system themeSource');
assert.strictEqual(resolveElectronThemeSource('dark'), 'dark', 'dark maps to electron dark themeSource');
assert.strictEqual(resolveElectronThemeSource('light'), 'light', 'light maps to electron light themeSource');

console.log('✓ Automatic dark/light system theme switching logic tests passed');

// 15. Test Cross-Computer Vault Configuration Synchronization (.daily-worklogs/config.json)
const VAULT_CONFIG_DIR = '.daily-worklogs';
const VAULT_CONFIG_FILE = 'config.json';

function getVaultConfigPath(vaultPath) {
  return path.join(vaultPath, VAULT_CONFIG_DIR, VAULT_CONFIG_FILE);
}

function readVaultConfig(vaultPath) {
  try {
    if (!vaultPath || !fs.existsSync(vaultPath)) return null;
    const cfgPath = getVaultConfigPath(vaultPath);
    if (fs.existsSync(cfgPath)) {
      const data = fs.readFileSync(cfgPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading vault config:', err);
  }
  return null;
}

function writeVaultConfig(vaultPath, config) {
  try {
    if (!vaultPath) return;
    const configDir = path.join(vaultPath, VAULT_CONFIG_DIR);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const cfgPath = path.join(configDir, VAULT_CONFIG_FILE);
    const { vaultPath: _ignored, ...portableConfig } = config;
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      ...portableConfig,
    };
    fs.writeFileSync(cfgPath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing vault config:', err);
  }
}

function simulateGetSettings(localSettingsFile, machineVaultPath) {
  let localSettings = {
    vaultPath: machineVaultPath,
    language: 'en',
    themeColor: 'indigo',
    colorScheme: 'auto',
    weekStartDay: 1,
    defaultTemplateId: 'standard-worklog',
    templates: [],
    kanbanColumns: [],
    routines: [],
    dateFormat: 'YYYY-MM-DD',
    hasCompletedOnboarding: false,
  };

  if (fs.existsSync(localSettingsFile)) {
    localSettings = { ...localSettings, ...JSON.parse(fs.readFileSync(localSettingsFile, 'utf-8')) };
  }

  if (localSettings.vaultPath && fs.existsSync(localSettings.vaultPath)) {
    const vaultConfig = readVaultConfig(localSettings.vaultPath);
    if (vaultConfig) {
      const { version: _v, updatedAt: _u, ...restVaultConfig } = vaultConfig;
      localSettings = {
        ...localSettings,
        ...restVaultConfig,
        vaultPath: localSettings.vaultPath, // Preserve local machine's path
      };
    }
  }

  return localSettings;
}

// Setup simulated shared cloud vault (e.g. in Dropbox/iCloud Drive)
const sharedCloudVault = path.join(os.tmpdir(), 'shared-cloud-vault');
if (fs.existsSync(sharedCloudVault)) {
  fs.rmSync(sharedCloudVault, { recursive: true });
}
fs.mkdirSync(sharedCloudVault, { recursive: true });

// Setup Computer A (e.g. macOS Laptop)
const computerASettingsFile = path.join(os.tmpdir(), 'computer-a-settings.json');
const computerAVaultPath = sharedCloudVault;
const computerASettings = {
  vaultPath: computerAVaultPath,
  language: 'es',
  themeColor: 'teal',
  dateFormat: 'DD/MM/YYYY',
  templates: [
    { id: 'custom-template', name: 'Custom Template A', content: '# Custom {{date}}' },
  ],
  routines: [
    { id: 'r1', title: 'Daily Standup Routine', schedule: 'weekdays', enabled: true },
  ],
  hasCompletedOnboarding: true,
};

// Computer A saves settings -> Writes to local and syncs to shared cloud vault
fs.writeFileSync(computerASettingsFile, JSON.stringify(computerASettings, null, 2), 'utf-8');
writeVaultConfig(computerAVaultPath, computerASettings);

// Verify .daily-worklogs/config.json was created inside the vault
assert.strictEqual(
  fs.existsSync(getVaultConfigPath(sharedCloudVault)),
  true,
  '.daily-worklogs/config.json must exist in vault'
);
const savedVaultConfig = readVaultConfig(sharedCloudVault);
assert.strictEqual(savedVaultConfig.language, 'es');
assert.strictEqual(savedVaultConfig.dateFormat, 'DD/MM/YYYY');
assert.strictEqual(savedVaultConfig.templates.length, 1);
assert.strictEqual(savedVaultConfig.routines[0].title, 'Daily Standup Routine');
assert.strictEqual(savedVaultConfig.vaultPath, undefined, 'Machine-specific vaultPath must NOT be in vault config');

// Setup Computer B (e.g. Windows PC with different local path pointing to the synced folder)
const computerBSettingsFile = path.join(os.tmpdir(), 'computer-b-settings.json');
const computerBMachineVaultPath = sharedCloudVault; // In reality e.g. C:\Users\rene\Dropbox\...
const computerBInitialSettings = {
  vaultPath: computerBMachineVaultPath,
  language: 'en', // Default on fresh install
  themeColor: 'indigo',
  dateFormat: 'YYYY-MM-DD',
  templates: [],
  routines: [],
  hasCompletedOnboarding: false,
};
fs.writeFileSync(computerBSettingsFile, JSON.stringify(computerBInitialSettings, null, 2), 'utf-8');

// Computer B opens the app -> getSettings() loads the configuration from the cloud vault!
const computerBLoadedSettings = simulateGetSettings(computerBSettingsFile, computerBMachineVaultPath);
assert.strictEqual(computerBLoadedSettings.language, 'es', 'Computer B should load synced language');
assert.strictEqual(computerBLoadedSettings.dateFormat, 'DD/MM/YYYY', 'Computer B should load synced date format');
assert.strictEqual(computerBLoadedSettings.templates.length, 1, 'Computer B should load synced custom templates');
assert.strictEqual(computerBLoadedSettings.templates[0].id, 'custom-template');
assert.strictEqual(computerBLoadedSettings.routines.length, 1, 'Computer B should load synced routines');
assert.strictEqual(computerBLoadedSettings.routines[0].title, 'Daily Standup Routine');
assert.strictEqual(computerBLoadedSettings.vaultPath, computerBMachineVaultPath, 'Computer B preserves its machine-specific path');

console.log('✓ Cross-computer vault configuration synchronization (.daily-worklogs/config.json) tests passed');

// --- Test Tag, Service & Project Hierarchy and Metrics ---
function parseTagHierarchy(tagName, tagDefinitions = []) {
  if (!tagName) return { service: 'General', project: 'General', isHierarchical: false };
  const trimmed = tagName.trim();
  const match = tagDefinitions.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  if (match && (match.service || match.project)) {
    return {
      service: match.service || 'General',
      project: match.project || match.name,
      isHierarchical: Boolean(match.service && match.project),
    };
  }
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    const s = parts[0].trim();
    const p = parts.slice(1).join('/').trim();
    return {
      service: s ? s.charAt(0).toUpperCase() + s.slice(1) : 'General',
      project: p || trimmed,
      isHierarchical: true,
    };
  }
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const s = parts[0].trim();
    const p = parts.slice(1).join(':').trim();
    return {
      service: s ? s.charAt(0).toUpperCase() + s.slice(1) : 'General',
      project: p || trimmed,
      isHierarchical: true,
    };
  }
  return {
    service: 'General',
    project: trimmed,
    isHierarchical: false,
  };
}

// 1. Tag hierarchy tests
const tagSlash = parseTagHierarchy('billing/stripe-integration');
assert.strictEqual(tagSlash.service, 'Billing');
assert.strictEqual(tagSlash.project, 'stripe-integration');
assert.strictEqual(tagSlash.isHierarchical, true);

const tagColon = parseTagHierarchy('auth:oauth2');
assert.strictEqual(tagColon.service, 'Auth');
assert.strictEqual(tagColon.project, 'oauth2');
assert.strictEqual(tagColon.isHierarchical, true);

const customDefinitions = [
  { name: 'frontend-core', service: 'Frontend', project: 'Design System', color: 'teal' },
];
const tagCustom = parseTagHierarchy('frontend-core', customDefinitions);
assert.strictEqual(tagCustom.service, 'Frontend');
assert.strictEqual(tagCustom.project, 'Design System');

// 2. Service and project aggregation logic
const sampleTasks = [
  { id: '1', title: 'Setup Stripe', tags: ['billing/stripe'], status: 'done' },
  { id: '2', title: 'Handle Webhooks', tags: ['billing/stripe'], status: 'in_progress' },
  { id: '3', title: 'Paypal Checkout', tags: ['billing/paypal'], status: 'todo' },
  { id: '4', title: 'OAuth Login', tags: ['auth/login'], status: 'done' },
];

const serviceBreakdown = {};
for (const task of sampleTasks) {
  const isDone = task.status === 'done';
  const isInProgress = task.status === 'in_progress';
  for (const tag of task.tags) {
    const { service, project } = parseTagHierarchy(tag, customDefinitions);
    if (!serviceBreakdown[service]) {
      serviceBreakdown[service] = { service, total: 0, completed: 0, inProgress: 0, projects: {} };
    }
    serviceBreakdown[service].total += 1;
    if (isDone) serviceBreakdown[service].completed += 1;
    if (isInProgress) serviceBreakdown[service].inProgress += 1;

    if (!serviceBreakdown[service].projects[project]) {
      serviceBreakdown[service].projects[project] = { total: 0, completed: 0, inProgress: 0 };
    }
    serviceBreakdown[service].projects[project].total += 1;
    if (isDone) serviceBreakdown[service].projects[project].completed += 1;
    if (isInProgress) serviceBreakdown[service].projects[project].inProgress += 1;
  }
}

assert.strictEqual(serviceBreakdown['Billing'].total, 3);
assert.strictEqual(serviceBreakdown['Billing'].completed, 1);
assert.strictEqual(serviceBreakdown['Billing'].inProgress, 1);
assert.strictEqual(serviceBreakdown['Billing'].projects['stripe'].total, 2);
assert.strictEqual(serviceBreakdown['Billing'].projects['paypal'].total, 1);
assert.strictEqual(serviceBreakdown['Auth'].total, 1);
assert.strictEqual(serviceBreakdown['Auth'].completed, 1);

console.log('✓ Tag hierarchy and service/project aggregation metrics tests passed');

// --- Test Area vs. Project (Things 3 / OmniFocus Model) ---
const testAreas = [
  {
    id: 'webcast',
    name: 'Webcast',
    color: 'indigo',
    icon: 'broadcast',
    defaultTags: ['webcast', 'streaming'],
  },
  {
    id: 'vc',
    name: 'VC',
    color: 'teal',
    icon: 'video',
    defaultTags: ['vc', 'rooms'],
  },
  {
    id: 'asr',
    name: 'ASR',
    color: 'violet',
    icon: 'microphone',
    defaultTags: ['asr', 'transcription'],
  },
];

const testProjects = [
  {
    id: 'proj-wowza',
    name: 'Migración Wowza',
    areaName: 'Webcast',
    targetDate: '2026-09-30',
    status: 'active',
    tags: ['wowza-v4'],
  },
  {
    id: 'proj-sala1',
    name: 'Renovación Sala 1',
    areaName: 'VC',
    targetDate: '2026-08-31',
    status: 'active',
  },
];

function resolveTaskContext(task, areas = [], projects = [], tagDefinitions = []) {
  let area = (task.area || '').trim();
  let project = (task.project || '').trim() || undefined;
  let isInheritedFromTag = false;

  if (!area && task.tags && task.tags.length > 0) {
    for (const tag of task.tags) {
      const parsed = parseTagHierarchy(tag, tagDefinitions);
      if (parsed.isHierarchical || parsed.service !== 'General') {
        area = parsed.service;
        if (!project && parsed.project && parsed.project !== 'General' && parsed.project !== parsed.service) {
          project = parsed.project;
        }
        isInheritedFromTag = true;
        break;
      }
    }
  }

  if (!area) area = 'General';

  const cleanArea = area.toLowerCase();
  const areaDef = areas.find((a) => a.name.toLowerCase() === cleanArea);
  const cleanProject = project ? project.toLowerCase() : '';
  const projectDef = cleanProject
    ? projects.find((p) => p.name.toLowerCase() === cleanProject && (!p.areaName || p.areaName.toLowerCase() === cleanArea))
    : undefined;

  const inheritedTagsSet = new Set();
  if (areaDef && areaDef.defaultTags) {
    areaDef.defaultTags.forEach((t) => inheritedTagsSet.add(t));
  }
  if (projectDef && projectDef.tags) {
    projectDef.tags.forEach((t) => inheritedTagsSet.add(t));
  }

  const explicitTags = Array.isArray(task.tags) ? task.tags : [];
  const effectiveTagsSet = new Set([...explicitTags, ...Array.from(inheritedTagsSet)]);
  const pureInherited = Array.from(inheritedTagsSet).filter((t) => !explicitTags.includes(t));

  return {
    area,
    project,
    isInheritedFromTag,
    areaDefinition: areaDef,
    projectDefinition: projectDef,
    inheritedTags: pureInherited,
    allEffectiveTags: Array.from(effectiveTagsSet),
  };
}

// 1. Test Task in Area with Project inherits Area default tags and Project tags
const taskInWowza = {
  id: 'task-1',
  title: 'Configure streaming endpoint on edge servers',
  area: 'Webcast',
  project: 'Migración Wowza',
  tags: ['backend'],
  status: 'done',
};

const resolvedCtx = resolveTaskContext(taskInWowza, testAreas, testProjects);
assert.strictEqual(resolvedCtx.area, 'Webcast');
assert.strictEqual(resolvedCtx.project, 'Migración Wowza');
assert.deepStrictEqual(resolvedCtx.inheritedTags.sort(), ['streaming', 'webcast', 'wowza-v4'].sort());
assert.deepStrictEqual(resolvedCtx.allEffectiveTags.sort(), ['backend', 'streaming', 'webcast', 'wowza-v4'].sort());
assert.strictEqual(taskInWowza.title, 'Configure streaming endpoint on edge servers', 'Task title must remain clean without prefixes');

// 2. Test Direct Task in Area (no project)
const directAreaTask = {
  id: 'task-2',
  title: 'Monitor morning executive webcast',
  area: 'Webcast',
  status: 'in_progress',
};

const directCtx = resolveTaskContext(directAreaTask, testAreas, testProjects);
assert.strictEqual(directCtx.area, 'Webcast');
assert.strictEqual(directCtx.project, undefined);
assert.deepStrictEqual(directCtx.inheritedTags.sort(), ['streaming', 'webcast'].sort());

// 3. Test Project Progress Calculation (% completion) vs Area Continuous Metrics
function calculateProjectProgress(projectName, areaName, tasks, areas, projects) {
  const projectTasks = tasks.filter((t) => {
    const ctx = resolveTaskContext(t, areas, projects);
    return ctx.project === projectName && (!areaName || ctx.area === areaName);
  });
  const completed = projectTasks.filter((t) => t.status === 'done' || t.status === 'cancelled').length;
  const inProgress = projectTasks.filter((t) => t.status === 'in_progress').length;
  const total = projectTasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, inProgress, percent };
}

const testTaskList = [
  { id: 't1', title: 'Task 1', area: 'Webcast', project: 'Migración Wowza', status: 'done' },
  { id: 't2', title: 'Task 2', area: 'Webcast', project: 'Migración Wowza', status: 'done' },
  { id: 't3', title: 'Task 3', area: 'Webcast', project: 'Migración Wowza', status: 'in_progress' },
  { id: 't4', title: 'Task 4', area: 'Webcast', project: 'Migración Wowza', status: 'todo' },
  { id: 't5', title: 'Task 5', area: 'Webcast', status: 'done' }, // Direct task
];

const wowzaProgress = calculateProjectProgress('Migración Wowza', 'Webcast', testTaskList, testAreas, testProjects);
assert.strictEqual(wowzaProgress.total, 4);
assert.strictEqual(wowzaProgress.completed, 2);
assert.strictEqual(wowzaProgress.inProgress, 1);
assert.strictEqual(wowzaProgress.percent, 50, 'Progress must be 50% (2 of 4 tasks completed)');

// 4. Test Area Rename cascading to child projects and task files
let localAreas = [
  { id: 'webcast', name: 'Webcast', color: 'indigo' },
  { id: 'vc', name: 'VC', color: 'teal' },
];
let localProjects = [
  { id: 'p1', name: 'Migración Wowza', areaName: 'Webcast' },
  { id: 'p2', name: 'CDN Setup', areaName: 'Webcast' },
  { id: 'p3', name: 'Renovación Sala 1', areaName: 'VC' },
];

function cascadeAreaRename(oldName, newAreaName, areasList, projectsList) {
  const cleanOld = oldName.trim().toLowerCase();
  const cleanNew = newAreaName.trim();
  const updatedAreas = areasList.map((a) =>
    a.name.toLowerCase() === cleanOld ? { ...a, name: cleanNew } : a
  );
  const updatedProjects = projectsList.map((p) =>
    (p.areaName || '').toLowerCase() === cleanOld ? { ...p, areaName: cleanNew } : p
  );
  return { updatedAreas, updatedProjects };
}

const renameResult = cascadeAreaRename('Webcast', 'Streaming & Webcast', localAreas, localProjects);
assert.strictEqual(renameResult.updatedAreas.find((a) => a.id === 'webcast').name, 'Streaming & Webcast');
// Child projects must now belong to "Streaming & Webcast"
const webcastProjects = renameResult.updatedProjects.filter(
  (p) => p.areaName === 'Streaming & Webcast'
);
assert.strictEqual(webcastProjects.length, 2, 'All projects inside the renamed area must cascade and not disappear');
assert.strictEqual(webcastProjects[0].name, 'Migración Wowza');
assert.strictEqual(webcastProjects[1].name, 'CDN Setup');

console.log('✓ Area vs Project (Things 3 / OmniFocus model) with tag inheritance, cascading rename, and progress metrics tests passed');

// --- Test Automatic Sequential Task IDs (GitHub-style) ---
function parseNumericTaskId(data) {
  if (!data) return undefined;
  if (typeof data.id === 'number' && !isNaN(data.id) && data.id > 0) {
    return Math.floor(data.id);
  }
  if (typeof data.taskId === 'number' && !isNaN(data.taskId) && data.taskId > 0) {
    return Math.floor(data.taskId);
  }
  if (typeof data.id === 'string') {
    const clean = data.id.replace(/^#/, '').trim();
    const parsed = parseInt(clean, 10);
    if (!isNaN(parsed) && parsed > 0 && String(parsed) === clean) {
      return parsed;
    }
  }
  if (typeof data.taskId === 'string') {
    const clean = data.taskId.replace(/^#/, '').trim();
    const parsed = parseInt(clean, 10);
    if (!isNaN(parsed) && parsed > 0 && String(parsed) === clean) {
      return parsed;
    }
  }
  return undefined;
}

assert.strictEqual(parseNumericTaskId({ id: 1 }), 1);
assert.strictEqual(parseNumericTaskId({ id: '42' }), 42);
assert.strictEqual(parseNumericTaskId({ id: '#105' }), 105);
assert.strictEqual(parseNumericTaskId({ taskId: 7 }), 7);
assert.strictEqual(parseNumericTaskId({ id: '2026-08-21-task-name' }), undefined);

const taskIdTestDir = path.join(testVault, 'task_id_tests');
if (!fs.existsSync(taskIdTestDir)) fs.mkdirSync(taskIdTestDir, { recursive: true });

fs.writeFileSync(
  path.join(taskIdTestDir, 'task-existing-1.md'),
  matter.stringify('First task', { id: 1, title: 'Existing Task 1' })
);
fs.writeFileSync(
  path.join(taskIdTestDir, 'task-existing-3.md'),
  matter.stringify('Third task', { id: 3, title: 'Existing Task 3' })
);
fs.writeFileSync(
  path.join(taskIdTestDir, 'task-unassigned-a.md'),
  matter.stringify('Unassigned A', { title: 'Unassigned Task A', created: '2026-08-01' })
);
fs.writeFileSync(
  path.join(taskIdTestDir, 'task-unassigned-b.md'),
  matter.stringify('Unassigned B', { title: 'Unassigned Task B', created: '2026-08-02' })
);

// Simulate ensureTasksHaveIds
function testEnsureTasksHaveIds(tasksDir) {
  const files = fs.readdirSync(tasksDir).filter((f) => f.toLowerCase().endsWith('.md'));
  const unassigned = [];
  let maxId = 0;

  for (const file of files) {
    const filepath = path.join(tasksDir, file);
    const parsed = matter(fs.readFileSync(filepath, 'utf-8'));
    const tId = parseNumericTaskId(parsed.data);
    if (tId) {
      if (tId > maxId) maxId = tId;
    } else {
      unassigned.push({
        file,
        filepath,
        createdTime: parsed.data?.created ? new Date(parsed.data.created).getTime() : 0,
      });
    }
  }

  unassigned.sort((a, b) => a.createdTime - b.createdTime);
  for (const item of unassigned) {
    maxId++;
    const parsed = matter(fs.readFileSync(item.filepath, 'utf-8'));
    const updated = matter.stringify(parsed.content, { ...parsed.data, id: maxId });
    fs.writeFileSync(item.filepath, updated, 'utf-8');
  }
}

testEnsureTasksHaveIds(taskIdTestDir);

const parsedA = matter(fs.readFileSync(path.join(taskIdTestDir, 'task-unassigned-a.md'), 'utf-8'));
const parsedB = matter(fs.readFileSync(path.join(taskIdTestDir, 'task-unassigned-b.md'), 'utf-8'));
assert.strictEqual(parsedA.data.id, 4, 'Oldest unassigned task should be assigned maxId + 1 (4)');
assert.strictEqual(parsedB.data.id, 5, 'Next unassigned task should be assigned maxId + 2 (5)');

console.log('✓ Automatic sequential task IDs (GitHub-style #1, #2...) parsing, auto-assignment, and persistence tests passed');

// Cleanup
fs.rmSync(testVault, { recursive: true });
if (fs.existsSync(sharedCloudVault)) fs.rmSync(sharedCloudVault, { recursive: true });
if (fs.existsSync(computerASettingsFile)) fs.rmSync(computerASettingsFile);
if (fs.existsSync(computerBSettingsFile)) fs.rmSync(computerBSettingsFile);
console.log('✓ All verification tests passed successfully!');








