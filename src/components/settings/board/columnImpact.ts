import { ColumnBehavior, DEFAULT_KANBAN_COLUMNS, KanbanColumnConfig, TaskMeta, TaskStatus } from '../../../types';

export interface TaskMove {
  filename: string;
  status: TaskStatus;
}

export function getTasksInColumns(tasks: TaskMeta[], columnIds: string[]): TaskMeta[] {
  const ids = new Set(columnIds);
  return tasks.filter((task) => ids.has(task.status));
}

/** Columns that are not part of the built-in set, regardless of the optional isCustom flag. */
export function getCustomColumns(columns: KanbanColumnConfig[]): KanbanColumnConfig[] {
  const defaultIds = new Set(DEFAULT_KANBAN_COLUMNS.map((col) => col.id));
  return columns.filter((col) => !defaultIds.has(col.id));
}

/** Columns that can receive tasks from a deleted column: every other visible column. */
export function getMoveTargets(columns: KanbanColumnConfig[], removedId: string): KanbanColumnConfig[] {
  return columns.filter((col) => col.id !== removedId && col.visible !== false);
}

/** Prefers a target with the same lifecycle behavior so dates and metrics stay meaningful. */
export function pickDefaultTarget(
  removed: KanbanColumnConfig,
  targets: KanbanColumnConfig[]
): KanbanColumnConfig | undefined {
  return targets.find((col) => col.behavior === removed.behavior) ?? targets[0];
}

function findDefaultColumnFor(behavior: ColumnBehavior): KanbanColumnConfig {
  const direct = DEFAULT_KANBAN_COLUMNS.find((col) => col.behavior === behavior);
  if (direct) return direct;
  // The default set has no cancelled column; closed work belongs in Done.
  return DEFAULT_KANBAN_COLUMNS.find((col) => col.behavior === 'done') ?? DEFAULT_KANBAN_COLUMNS[0];
}

/** Plans where tasks of custom columns go when the board is reset to the built-in columns. */
export function planResetMoves(tasks: TaskMeta[], columns: KanbanColumnConfig[]): TaskMove[] {
  const moves: TaskMove[] = [];
  for (const column of getCustomColumns(columns)) {
    const target = findDefaultColumnFor(column.behavior);
    for (const task of tasks) {
      if (task.status === column.id) moves.push({ filename: task.filename, status: target.id });
    }
  }
  return moves;
}
