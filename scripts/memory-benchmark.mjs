import assert from 'node:assert/strict';

const taskCount = Number.parseInt(process.env.WORKLOG_BENCH_TASKS || '10000', 10);
const dayCount = Number.parseInt(process.env.WORKLOG_BENCH_DAYS || '365', 10);
const body = '# Task details\n\n' + 'Synthetic task content for memory measurement. '.repeat(100);

function bytes(value) {
  return Buffer.byteLength(JSON.stringify(value));
}

function formatMiB(value) {
  return `${(value / 1024 / 1024).toFixed(2)} MiB`;
}

function createTask(index) {
  const metadata = {
    id: `task-${index}`,
    taskId: index + 1,
    filename: `task-${index}.md`,
    filepath: `/synthetic/tasks/task-${index}.md`,
    title: `Synthetic task ${index}`,
    status: index % 4 === 0 ? 'done' : 'todo',
    priority: 'medium',
    created: '2026-01-01',
    tags: ['benchmark', `group-${index % 20}`],
    checklistTotal: 3,
    checklistCompleted: 1,
  };
  return {
    metadata,
    detail: {
      ...metadata,
      content: body,
      rawContent: `---\ntitle: ${metadata.title}\n---\n${body}`,
      frontmatter: { title: metadata.title, status: metadata.status },
      activityLog: [],
    },
  };
}

global.gc?.();
const heapBefore = process.memoryUsage().heapUsed;
const tasks = Array.from({ length: taskCount }, (_, index) => createTask(index));
const days = Array.from({ length: dayCount }, (_, index) => ({
  date: `2026-${String(Math.floor(index / 31) + 1).padStart(2, '0')}-${String((index % 31) + 1).padStart(2, '0')}`,
  exists: index % 3 === 0,
  tasksTotal: 3,
  tasksCompleted: 1,
  content: body,
  sections: [{ title: 'Overview', body }],
}));

const legacyTaskPayload = tasks.map((task) => task.detail);
const optimizedTaskPayload = tasks.map((task) => task.metadata);
const legacyPeriodPayload = {
  days,
  periodTasks: legacyTaskPayload,
  completedTasksList: legacyTaskPayload.filter((task) => task.status === 'done'),
  backlogTasksList: legacyTaskPayload.filter((task) => task.status !== 'done'),
};
const optimizedPeriodPayload = {
  days: days.filter((day) => day.exists).map(({ content: _content, sections: _sections, ...day }) => day),
  periodTaskCount: optimizedTaskPayload.length,
  completedTasksList: optimizedTaskPayload.filter((task) => task.status === 'done'),
  backlogTasksList: optimizedTaskPayload.filter((task) => task.status !== 'done'),
};

const results = {
  taskList: { legacy: bytes(legacyTaskPayload), optimized: bytes(optimizedTaskPayload) },
  periodReport: { legacy: bytes(legacyPeriodPayload), optimized: bytes(optimizedPeriodPayload) },
  heapAllocated: process.memoryUsage().heapUsed - heapBefore,
};

assert.ok(results.taskList.optimized < results.taskList.legacy * 0.25);
assert.ok(results.periodReport.optimized < results.periodReport.legacy * 0.25);

console.log(`Synthetic dataset: ${taskCount} tasks, ${dayCount} days`);
console.log(`Task list payload: ${formatMiB(results.taskList.legacy)} -> ${formatMiB(results.taskList.optimized)}`);
console.log(`Period payload: ${formatMiB(results.periodReport.legacy)} -> ${formatMiB(results.periodReport.optimized)}`);
console.log(`Benchmark heap allocation: ${formatMiB(results.heapAllocated)}`);
