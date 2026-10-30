import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import { renderWithMantine } from '../utils/test-utils';
import { KanbanColumn, KanbanColumnProps } from '../../src/components/kanban/KanbanColumn';
import type { KanbanColumnConfig, TaskMeta } from '../../src/types';

const doneColumn: KanbanColumnConfig = {
  id: 'done',
  title: 'Done',
  behavior: 'done',
  color: 'green',
  iconName: 'check',
  visible: true,
};

const todoColumn: KanbanColumnConfig = { ...doneColumn, id: 'todo', title: 'To do', behavior: 'todo' };

function daysAgo(days: number): string {
  return dayjs().subtract(days, 'day').format('YYYY-MM-DD');
}

function makeTask(id: string, status: string, completedDaysAgo: number): TaskMeta {
  return {
    id,
    taskId: Number(id.replace(/\D/g, '')) || undefined,
    filename: `${id}.md`,
    filepath: `/tasks/${id}.md`,
    title: `Title ${id}`,
    status,
    created: daysAgo(completedDaysAgo + 1),
    completedDate: daysAgo(completedDaysAgo),
  };
}

function renderColumn(overrides: Partial<KanbanColumnProps>) {
  const column = overrides.column ?? doneColumn;
  const props: KanbanColumnProps = {
    column,
    tasks: [],
    closedWindowDays: 30,
    isSearching: false,
    isTargeted: false,
    draggingTaskId: null,
    visibleColumns: [column],
    columnBehaviorMap: new Map([[column.id, column.behavior]]),
    onDragOver: vi.fn(),
    onDragLeave: vi.fn(),
    onDrop: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onQuickAdd: vi.fn(),
    onOpenEditor: vi.fn(),
    onOpenModal: vi.fn(),
    onUpdateStatus: vi.fn(),
    onDeleteTask: vi.fn(),
    areas: [],
    projects: [],
    storeAllTags: [],
    ...overrides,
  };
  return renderWithMantine(<KanbanColumn {...props} />);
}

describe('KanbanColumn closed task window', () => {
  const tasks = [
    makeTask('t1', 'done', 60),
    makeTask('t2', 'done', 2),
    makeTask('t3', 'done', 90),
  ];

  it('shows recent tasks newest first and a footer with the older count', () => {
    renderColumn({ tasks: [makeTask('t4', 'done', 10), ...tasks] });

    expect(screen.getByText('Title t2')).toBeInTheDocument();
    expect(screen.getByText('Title t4')).toBeInTheDocument();
    expect(screen.queryByText('Title t1')).not.toBeInTheDocument();
    expect(screen.queryByText('Title t3')).not.toBeInTheDocument();
    expect(screen.getByText(/^Show \d+ older$/)).toBeInTheDocument();
    // Header count stays the column total
    expect(screen.getByText('(4)')).toBeInTheDocument();

    const titles = screen.getAllByText(/^Title t/).map((el) => el.textContent);
    expect(titles).toEqual(['Title t2', 'Title t4']);
  });

  it('expands and collapses older tasks', () => {
    renderColumn({ tasks });

    fireEvent.click(screen.getByText(/^Show \d+ older$/));
    expect(screen.getByText('Title t1')).toBeInTheDocument();
    expect(screen.getByText('Title t3')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Hide older'));
    expect(screen.queryByText('Title t1')).not.toBeInTheDocument();
  });

  it('shows all tasks and no footer while searching', () => {
    renderColumn({ tasks, isSearching: true });

    expect(screen.getByText('Title t1')).toBeInTheDocument();
    expect(screen.getByText('Title t3')).toBeInTheDocument();
    expect(screen.queryByText(/^Show \d+ older$/)).not.toBeInTheDocument();
  });

  it('shows everything without a footer when the window is null', () => {
    renderColumn({ tasks, closedWindowDays: null });

    expect(screen.getByText('Title t1')).toBeInTheDocument();
    expect(screen.queryByText(/^Show \d+ older$/)).not.toBeInTheDocument();
  });

  it('does not window non-closed columns', () => {
    renderColumn({
      column: todoColumn,
      tasks: [makeTask('t1', 'todo', 90), makeTask('t2', 'todo', 1)],
    });

    expect(screen.getByText('Title t1')).toBeInTheDocument();
    expect(screen.getByText('Title t2')).toBeInTheDocument();
    expect(screen.queryByText(/^Show \d+ older$/)).not.toBeInTheDocument();
  });

  it('shows only the footer when the recent window is empty but older tasks exist', () => {
    renderColumn({ tasks: [makeTask('t1', 'done', 60)] });

    expect(screen.getByText(/^Show \d+ older$/)).toBeInTheDocument();
    expect(screen.queryByText('No tasks in this column')).not.toBeInTheDocument();
  });

  it('shows the empty placeholder when the column has no tasks', () => {
    renderColumn({ tasks: [] });

    expect(screen.getByText('No tasks in this column')).toBeInTheDocument();
    expect(screen.queryByText(/^Show \d+ older$/)).not.toBeInTheDocument();
  });
});
