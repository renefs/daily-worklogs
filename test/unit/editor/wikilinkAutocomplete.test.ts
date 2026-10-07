import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { autocompletion, startCompletion, currentCompletions, CompletionContext } from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';
import { createTagCompletionSource } from '../../../src/components/editor/tagAutocompleteExtension';
import {
  createWikilinkCompletionSource,
  createWikilinkInputHandler,
  createEditorAutocompleteExtension,
} from '../../../src/components/editor/wikilinkAutocompleteExtension';

describe('Wikilink and Tag Autocomplete Extension', () => {
  const mockTasks = [
    { taskId: 1, title: 'Fix login error', status: 'todo' } as any,
    { taskId: 42, title: 'Deploy App to Production', status: 'done', tags: ['release', 'devops'] } as any,
    { title: 'Draft documentation', status: 'in-progress', filename: 'draft-doc.md' } as any,
  ];

  const mockNotes = [
    { date: '2026-10-07', filepath: '2026-10-07.md' } as any,
    { date: '2026-10-08', filepath: '2026-10-08.md' } as any,
  ];

  const mockTags = ['bug', 'feature', 'release'];

  function createTestEditor(doc: string, anchor = doc.length) {
    const view = new EditorView({
      state: EditorState.create({
        doc,
        selection: { anchor },
        extensions: [
          createEditorAutocompleteExtension({
            getTags: () => mockTags,
            getNotes: () => mockNotes,
            getTasks: () => mockTasks,
          }),
        ],
      }),
    });
    return view;
  }

  it('triggers task completions when typing [[#', async () => {
    const view = createTestEditor('[[#');
    startCompletion(view);
    await new Promise((r) => setTimeout(r, 50));

    const completions = currentCompletions(view.state);
    expect(completions.length).toBe(3);

    // All should be tasks
    expect(completions.every((c) => c.detail?.startsWith('Task'))).toBe(true);
    // Notes and tags should NOT be included
    expect(completions.some((c) => c.label.includes('2026'))).toBe(false);
    expect(completions.some((c) => c.label === '#bug' || c.label === '#release')).toBe(false);

    // Verify labels include task alias formatting
    expect(completions.map((c) => c.label)).toEqual([
      '#1|Fix login error',
      '#42|Deploy App to Production',
      'draft-doc.md',
    ]);
  });

  it('filters by exact/prefix taskId when typing [[#42', async () => {
    const view = createTestEditor('[[#42');
    startCompletion(view);
    await new Promise((r) => setTimeout(r, 50));

    const completions = currentCompletions(view.state);
    expect(completions.length).toBe(1);
    expect(completions[0].label).toBe('#42|Deploy App to Production');
    expect(completions[0].displayLabel).toBe('✓ #42 - Deploy App to Production');
  });

  it('filters tasks by title when typing [[#login', async () => {
    const view = createTestEditor('[[#login');
    startCompletion(view);
    await new Promise((r) => setTimeout(r, 50));

    const completions = currentCompletions(view.state);
    expect(completions.length).toBe(1);
    expect(completions[0].label).toBe('#1|Fix login error');
  });

  it('filters tasks by tag when typing [[#devops', async () => {
    const view = createTestEditor('[[#devops');
    startCompletion(view);
    await new Promise((r) => setTimeout(r, 50));

    const completions = currentCompletions(view.state);
    expect(completions.length).toBe(1);
    expect(completions[0].label).toBe('#42|Deploy App to Production');
  });

  it('applies task completion replacing the entire [[# token with formatted wikilink', async () => {
    const view = createTestEditor('Please review [[#');
    startCompletion(view);
    await new Promise((r) => setTimeout(r, 50));

    const completions = currentCompletions(view.state);
    expect(completions.length).toBeGreaterThan(0);

    const targetCompletion = completions.find((c) => c.label.startsWith('#1'))!;
    expect(targetCompletion).toBeDefined();

    if (typeof targetCompletion.apply === 'function') {
      targetCompletion.apply(view, targetCompletion, 14, 17);
      expect(view.state.doc.toString()).toBe('Please review [[#1|Fix login error]]');
    }
  });

  it('shows both daily notes and tasks when typing [[ without #', async () => {
    const view = createTestEditor('[[');
    startCompletion(view);
    await new Promise((r) => setTimeout(r, 50));

    const completions = currentCompletions(view.state);
    expect(completions.length).toBe(5); // 2 notes + 3 tasks

    const noteCompletions = completions.filter((c) => c.detail === 'Daily note');
    const taskCompletions = completions.filter((c) => c.detail?.startsWith('Task'));
    expect(noteCompletions.length).toBe(2);
    expect(taskCompletions.length).toBe(3);
  });

  it('filters daily notes when typing date prefix [[2026', async () => {
    const view = createTestEditor('[[2026');
    startCompletion(view);
    await new Promise((r) => setTimeout(r, 50));

    const completions = currentCompletions(view.state);
    expect(completions.length).toBe(2);
    expect(completions.every((c) => c.detail === 'Daily note')).toBe(true);
  });

  it('prevents tag completion from triggering inside wikilinks', () => {
    const text = '[[#';
    const state = EditorState.create({ doc: text });
    const context = new CompletionContext(state, 3, false);

    const tagSource = createTagCompletionSource(() => mockTags);
    const result = tagSource(context);
    expect(result).toBeNull();
  });

  it('allows standard #tag autocompletion outside wikilinks', async () => {
    const view = createTestEditor('#rel');
    startCompletion(view);
    await new Promise((r) => setTimeout(r, 50));

    const completions = currentCompletions(view.state);
    expect(completions.length).toBe(1);
    expect(completions[0].label).toBe('#release');
  });
});
