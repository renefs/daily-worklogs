import { describe, it, expect } from 'vitest';
import {
  DEFAULT_AREAS,
  getAreaColor,
  getAreaIcon,
  calculateProjectProgress,
  calculateAreaMetrics,
  resolveTaskContext,
} from '../../../src/utils/areaProjectUtils';
import type { TaskMeta, ProjectDefinition, AreaDefinition } from '../../../src/types';

describe('areaProjectUtils', () => {
  const testAreas: AreaDefinition[] = [
    {
      id: 'webcast',
      name: 'Webcast',
      color: 'indigo',
      icon: 'broadcast',
      defaultTags: ['streaming', 'webcast'],
    },
  ];

  const testProjects: ProjectDefinition[] = [
    {
      id: 'p1',
      name: 'Migración Wowza',
      areaName: 'Webcast',
      status: 'active',
      tags: ['wowza-v4'],
    },
  ];

  describe('getAreaColor & getAreaIcon', () => {
    it('returns configured color and icon for configured areas', () => {
      const configuredAreas: AreaDefinition[] = [
        { id: 'webcast', name: 'Webcast', color: 'indigo', icon: 'broadcast' },
        { id: 'vc', name: 'VC', color: 'teal', icon: 'video' },
      ];
      expect(getAreaColor('Webcast', configuredAreas)).toBe('indigo');
      expect(getAreaIcon('Webcast', configuredAreas)).toBe('broadcast');

      expect(getAreaColor('VC', configuredAreas)).toBe('teal');
      expect(getAreaIcon('VC', configuredAreas)).toBe('video');
    });

    it('seeds neutral defaults for new installs', () => {
      const names = DEFAULT_AREAS.map((a) => a.name);
      expect(names).not.toContain('Webcast');
      expect(names).toContain('General');
    });

    it('falls back gracefully for unknown areas', () => {
      expect(getAreaColor('', DEFAULT_AREAS)).toBe('gray');
      expect(getAreaIcon('', DEFAULT_AREAS)).toBe('folder');
      expect(getAreaColor('CustomUnknownArea', DEFAULT_AREAS)).toBeDefined();
    });
  });

  describe('calculateProjectProgress', () => {
    const tasks: TaskMeta[] = [
      { id: '1', taskId: 1, title: 'Task 1', status: 'done', project: 'Alpha', content: '' },
      { id: '2', taskId: 2, title: 'Task 2', status: 'done', project: 'Alpha', content: '' },
      { id: '3', taskId: 3, title: 'Task 3', status: 'in-progress', project: 'Alpha', content: '' },
      { id: '4', taskId: 4, title: 'Task 4', status: 'todo', project: 'Alpha', content: '' },
      { id: '5', taskId: 5, title: 'Task 5', status: 'done', project: 'Beta', content: '' },
    ];

    it('calculates completion percentage and counts accurately for a project', () => {
      const progress = calculateProjectProgress('Alpha', undefined, tasks);
      expect(progress.total).toBe(4);
      expect(progress.completed).toBe(2);
      expect(progress.percent).toBe(50);
    });

    it('returns 0 percentage when project has no tasks', () => {
      const progress = calculateProjectProgress('EmptyProject', undefined, tasks);
      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.percent).toBe(0);
    });
  });

  describe('calculateAreaMetrics', () => {
    const tasks: TaskMeta[] = [
      { id: '1', taskId: 1, title: 'Task 1', status: 'done', area: 'Webcast', content: '' },
      { id: '2', taskId: 2, title: 'Task 2', status: 'todo', area: 'Webcast', content: '' },
      { id: '3', taskId: 3, title: 'Task 3', status: 'done', area: 'VC', content: '' },
    ];

    it('computes aggregated metrics per area', () => {
      const metrics = calculateAreaMetrics('Webcast', tasks, testProjects, testAreas);
      expect(metrics.totalTasks).toBe(2);
      expect(metrics.completedTasks).toBe(1);
    });
  });

  describe('resolveTaskContext', () => {
    it('inherits area default tags and project tags', () => {
      const task: TaskMeta = {
        id: 'task-1',
        title: 'Configure streaming endpoint',
        area: 'Webcast',
        project: 'Migración Wowza',
        tags: ['backend'],
        status: 'done',
        content: '',
      };

      const context = resolveTaskContext(task, testAreas, testProjects);
      expect(context.area).toBe('Webcast');
      expect(context.project).toBe('Migración Wowza');
      expect(context.allEffectiveTags.sort()).toEqual(
        ['backend', 'streaming', 'webcast', 'wowza-v4'].sort()
      );
      expect(context.inheritedTags.sort()).toEqual(['streaming', 'webcast', 'wowza-v4'].sort());
    });

    it('resolves direct task in area without project', () => {
      const directTask: TaskMeta = {
        id: 'task-2',
        title: 'Monitor live stream',
        area: 'Webcast',
        status: 'in-progress',
        content: '',
      };

      const context = resolveTaskContext(directTask, testAreas, testProjects);
      expect(context.area).toBe('Webcast');
      expect(context.project).toBeUndefined();
      expect(context.inheritedTags.sort()).toEqual(['streaming', 'webcast'].sort());
    });
  });
});

