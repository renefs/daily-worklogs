import { describe, expect, it } from 'vitest';
import { filterAreas, findOrphanedProjects } from '../../../src/components/settings/areas/areaSearch';
import type { AreaDefinition, ProjectDefinition } from '../../../src/types';

const areas: AreaDefinition[] = [
  { id: 'a', name: 'Platform', defaultTags: ['infra'] },
  { id: 'b', name: 'Operations', description: 'Run the business' },
];

const projects: ProjectDefinition[] = [
  { id: 'p1', name: 'Migration', areaName: 'Platform', tags: ['cloud'] },
  { id: 'p2', name: 'Legacy cleanup', areaName: 'Removed area', tags: ['cleanup'] },
];

describe('filterAreas', () => {
  it('returns every area for an empty query', () => {
    expect(filterAreas(areas, projects, '  ')).toEqual(areas);
  });

  it('matches area default tags, with or without a leading hash', () => {
    expect(filterAreas(areas, projects, 'infra').map((a) => a.name)).toEqual(['Platform']);
    expect(filterAreas(areas, projects, '#infra').map((a) => a.name)).toEqual(['Platform']);
  });

  it('matches an area through the tags of one of its projects', () => {
    expect(filterAreas(areas, projects, 'cloud').map((a) => a.name)).toEqual(['Platform']);
  });

  it('matches by description', () => {
    expect(filterAreas(areas, projects, 'business').map((a) => a.name)).toEqual(['Operations']);
  });
});

describe('findOrphanedProjects', () => {
  it('lists projects whose area does not exist', () => {
    expect(findOrphanedProjects(areas, projects, '').map((p) => p.id)).toEqual(['p2']);
  });

  it('keeps matching orphans visible even when no area matches the query', () => {
    expect(filterAreas(areas, projects, 'cleanup')).toEqual([]);
    expect(findOrphanedProjects(areas, projects, 'cleanup').map((p) => p.id)).toEqual(['p2']);
  });

  it('hides orphans that do not match the query', () => {
    expect(findOrphanedProjects(areas, projects, 'zzz')).toEqual([]);
  });

  it('treats every project as an orphan when there are no areas', () => {
    expect(findOrphanedProjects([], projects, '').map((p) => p.id)).toEqual(['p1', 'p2']);
  });
});
