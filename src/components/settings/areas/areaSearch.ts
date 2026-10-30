import { AreaDefinition, ProjectDefinition } from '../../../types';

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesTags(tags: string[] | undefined, query: string): boolean {
  const tagQuery = query.replace(/^#/, '');
  if (!tagQuery) return false;
  return (tags || []).some((tag) => tag.toLowerCase().replace(/^#/, '').includes(tagQuery));
}

function projectMatches(project: ProjectDefinition, query: string): boolean {
  return (
    project.name.toLowerCase().includes(query) ||
    (project.description || '').toLowerCase().includes(query) ||
    matchesTags(project.tags, query)
  );
}

function areaMatches(area: AreaDefinition, query: string): boolean {
  return (
    area.name.toLowerCase().includes(query) ||
    (area.description || '').toLowerCase().includes(query) ||
    matchesTags(area.defaultTags, query)
  );
}

/** Areas that match by name, description or tags, or that own a matching project. */
export function filterAreas(
  areas: AreaDefinition[],
  projects: ProjectDefinition[],
  rawQuery: string
): AreaDefinition[] {
  const query = normalizeQuery(rawQuery);
  if (!query) return areas;
  return areas.filter(
    (area) =>
      areaMatches(area, query) ||
      projects.some(
        (project) =>
          (project.areaName || '').toLowerCase() === area.name.toLowerCase() && projectMatches(project, query)
      )
  );
}

/** Projects whose parent area no longer exists, narrowed by the search query. */
export function findOrphanedProjects(
  areas: AreaDefinition[],
  projects: ProjectDefinition[],
  rawQuery: string
): ProjectDefinition[] {
  const query = normalizeQuery(rawQuery);
  const areaNames = new Set(areas.map((area) => area.name.toLowerCase()));
  return projects.filter((project) => {
    if (areaNames.has((project.areaName || '').toLowerCase())) return false;
    if (!query) return true;
    return projectMatches(project, query) || (project.areaName || '').toLowerCase().includes(query);
  });
}
