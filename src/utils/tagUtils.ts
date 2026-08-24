import { TagDefinition } from '../types';

export const TAG_COLOR_PALETTE = [
  'teal',
  'indigo',
  'blue',
  'violet',
  'cyan',
  'grape',
  'orange',
  'pink',
  'green',
  'red',
  'yellow',
  'lime',
];

/**
 * Returns a consistent hash-based color from the palette for a tag name
 */
export function getHashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % TAG_COLOR_PALETTE.length;
  return TAG_COLOR_PALETTE[index];
}

/**
 * Returns the color assigned to a tag, falling back to its definition or a deterministic color
 */
export function getTagColor(tagName: string, tagDefinitions: TagDefinition[] = []): string {
  if (!tagName) return 'gray';
  const clean = tagName.trim().toLowerCase();
  const match = tagDefinitions.find((t) => t.name.toLowerCase() === clean);
  if (match && match.color) {
    return match.color;
  }
  return getHashColor(clean);
}

export interface ParsedTagHierarchy {
  service: string;
  project: string;
  isHierarchical: boolean;
}

/**
 * Resolves the service and project for a given tag
 */
export function parseTagHierarchy(
  tagName: string,
  tagDefinitions: TagDefinition[] = []
): ParsedTagHierarchy {
  if (!tagName) return { service: 'General', project: 'General', isHierarchical: false };
  const trimmed = tagName.trim();
  const lower = trimmed.toLowerCase();

  // Check explicit definition first
  const match = tagDefinitions.find((t) => t.name.toLowerCase() === lower);
  if (match && (match.service || match.project)) {
    return {
      service: match.service || 'General',
      project: match.project || match.name,
      isHierarchical: Boolean(match.service && match.project),
    };
  }

  // Check '/' hierarchy
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

  // Check ':' hierarchy
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

/**
 * Formats tag label nicely
 */
export function formatTagDisplay(tagName: string): string {
  if (!tagName) return '';
  return tagName.startsWith('#') ? tagName : `#${tagName}`;
}
