// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' }, nativeTheme: {} }));

import { DEFAULT_TEMPLATES, upgradeBuiltInTemplates } from '../../../electron/services/settingsService';

describe('upgradeBuiltInTemplates', () => {
  it('ships a Notes section in the standard and standup templates', () => {
    for (const id of ['standard-worklog', 'standup', 'simple-tasks']) {
      expect(DEFAULT_TEMPLATES.find((t) => t.id === id)?.content).toMatch(/\n## Notes\n$/);
    }
  });

  it('upgrades a template that still equals the previous default', () => {
    const current = DEFAULT_TEMPLATES.find((t) => t.id === 'standup')!;
    const old = { ...current, content: current.content.replace(/\n## Notes\n$/, '') };
    const [upgraded] = upgradeBuiltInTemplates([old]);
    expect(upgraded.content).toBe(current.content);
  });

  it('keeps customised templates and unknown ids', () => {
    const current = DEFAULT_TEMPLATES.find((t) => t.id === 'standard-worklog')!;
    const custom = { ...current, content: `${current.content.replace(/\n## Notes\n$/, '')}\n## Mine\n` };
    const other = { id: 'mine', name: 'Mine', description: '', content: '# {{date}}\n' };
    const result = upgradeBuiltInTemplates([custom, other, ...DEFAULT_TEMPLATES.filter((t) => t.id === 'blank')]);
    expect(result[0]).toBe(custom);
    expect(result[1]).toBe(other);
    expect(result[2].content).toBe('# {{date}}\n\n');
  });
});
