import { autocompletion, CompletionContext, CompletionResult, Completion, startCompletion } from '@codemirror/autocomplete';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type { DailyNoteMeta, TaskMeta, TagDefinition } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { createTagCompletionSource } from './tagAutocompleteExtension';

export interface WikilinkDataSource {
  getNotes: () => DailyNoteMeta[];
  getTasks: () => TaskMeta[];
}

export function createWikilinkInputHandler(): Extension {
  return EditorView.inputHandler.of((view, from, _to, text) => {
    const isDoubleBracket = text === '[' && from > 0 && view.state.sliceDoc(from - 1, from) === '[';
    const isHashAfterWikilink = text === '#' && from >= 2 && view.state.sliceDoc(from - 2, from) === '[[';
    if (isDoubleBracket || isHashAfterWikilink) {
      setTimeout(() => {
        startCompletion(view);
      }, 10);
    }
    return false;
  });
}

export function createTagInputHandler(): Extension {
  return EditorView.inputHandler.of((view, from, _to, text) => {
    if (text === '#' && (from === 0 || /\s/.test(view.state.sliceDoc(from - 1, from)))) {
      setTimeout(() => {
        startCompletion(view);
      }, 10);
    }
    return false;
  });
}

export function createWikilinkCompletionSource(dataSource: WikilinkDataSource) {
  return (context: CompletionContext): CompletionResult | null => {
    // Match [[ followed by non-closing bracket characters
    const word = context.matchBefore(/\[\[[^\]]*/);
    if (!word) return null;

    let syntaxNode = syntaxTree(context.state).resolveInner(context.pos, -1);
    while (syntaxNode) {
      if (['FencedCode', 'CodeText', 'InlineCode'].includes(syntaxNode.name)) return null;
      const parent = syntaxNode.parent;
      if (!parent) break;
      syntaxNode = parent;
    }

    const rawQuery = word.text.slice(2).replace(/\]\]$/, '').trim().toLowerCase();
    const isTaskExplicit = rawQuery.startsWith('#');
    const taskQuery = isTaskExplicit ? rawQuery.slice(1).trim() : rawQuery;

    const sourceNotes = dataSource.getNotes();
    const notes = (sourceNotes && sourceNotes.length > 0) ? sourceNotes : (useAppStore.getState().notesList || []);
    const sourceTasks = dataSource.getTasks();
    const tasks = (sourceTasks && sourceTasks.length > 0) ? sourceTasks : (useAppStore.getState().tasks || []);

    const options: Completion[] = [];

    // 1. Daily notes matching (only if not explicitly looking for task via #)
    if (!isTaskExplicit) {
      for (const note of notes) {
        if (!note || !note.date) continue;
        const dateStr = note.date;
        if (!rawQuery || dateStr.toLowerCase().includes(rawQuery)) {
          options.push({
            label: dateStr,
            displayLabel: `📅 ${dateStr}`,
            detail: 'Daily note',
            type: 'text',
            boost: dateStr.startsWith(rawQuery) ? 3 : 1,
            apply: (view: EditorView, completion: Completion, from: number, to: number) => {
              const insertText = `[[${completion.label}]]`;
              view.dispatch({
                changes: { from, to, insert: insertText },
                selection: { anchor: from + insertText.length },
              });
            },
          });
        }
      }
    }

    // 2. Tasks matching
    for (const task of tasks) {
      if (!task || !task.title) continue;
      const taskIdStr = task.taskId !== undefined ? String(task.taskId) : '';
      const idPrefix = taskIdStr ? `#${taskIdStr}` : '';
      const taskDisplay = idPrefix ? `${idPrefix} - ${task.title}` : task.title;
      const cleanTitle = task.title.replace(/[[\]|]/g, '').trim();
      const insertTarget = idPrefix
        ? (cleanTitle ? `${idPrefix}|${cleanTitle}` : idPrefix)
        : (task.filename || cleanTitle);

      let matches = false;
      let boost = 2;

      if (isTaskExplicit) {
        // User typed [[# or [[#someQuery
        if (!taskQuery) {
          // Just [[# - match all tasks!
          matches = true;
          boost = taskIdStr ? 3 : 2;
        } else {
          const titleLower = task.title.toLowerCase();
          const filenameLower = (task.filename || '').toLowerCase();
          const tagsLower = (task.tags || []).map((t) => t.toLowerCase());

          if (taskIdStr === taskQuery) {
            matches = true;
            boost = 10;
          } else if (taskIdStr.startsWith(taskQuery)) {
            matches = true;
            boost = 6;
          } else if (titleLower.includes(taskQuery)) {
            matches = true;
            boost = titleLower.startsWith(taskQuery) ? 5 : 4;
          } else if (filenameLower.includes(taskQuery)) {
            matches = true;
            boost = 3;
          } else if (tagsLower.some((t) => t.includes(taskQuery))) {
            matches = true;
            boost = 3;
          }
        }
      } else {
        // User typed [[ without leading #
        if (!rawQuery) {
          matches = true;
          boost = 2;
        } else {
          const titleLower = task.title.toLowerCase();
          const taskSearchable = `${idPrefix} ${task.title} ${task.filename || ''}`.toLowerCase();

          if (taskIdStr === rawQuery || idPrefix === rawQuery) {
            matches = true;
            boost = 8;
          } else if (taskIdStr.startsWith(rawQuery)) {
            matches = true;
            boost = 5;
          } else if (taskSearchable.includes(rawQuery)) {
            matches = true;
            boost = titleLower.startsWith(rawQuery) ? 4 : 2;
          }
        }
      }

      if (matches) {
        options.push({
          label: insertTarget,
          displayLabel: `✓ ${taskDisplay}`,
          detail: `Task (${task.status || 'todo'})`,
          type: 'keyword',
          boost,
          apply: (view: EditorView, completion: Completion, from: number, to: number) => {
            const insertText = `[[${completion.label}]]`;
            view.dispatch({
              changes: { from, to, insert: insertText },
              selection: { anchor: from + insertText.length },
            });
          },
        });
      }
    }

    if (options.length === 0) return null;

    options.sort((a, b) => (b.boost ?? 0) - (a.boost ?? 0) || a.label.localeCompare(b.label));

    return {
      from: word.from,
      options: options.slice(0, 50),
      validFor: /^\[\[[^\]]*$/,
      filter: false,
    };
  };
}

export function createWikilinkAutocompleteExtension(dataSource: WikilinkDataSource): Extension {
  return [
    autocompletion({
      override: [createWikilinkCompletionSource(dataSource)],
      defaultKeymap: true,
      icons: true,
    }),
    createWikilinkInputHandler(),
  ];
}

export function createEditorAutocompleteExtension(options: {
  getTags: () => TagDefinition[] | string[];
  getNotes: () => DailyNoteMeta[];
  getTasks: () => TaskMeta[];
}): Extension {
  return [
    autocompletion({
      override: [
        createTagCompletionSource(options.getTags),
        createWikilinkCompletionSource({
          getNotes: options.getNotes,
          getTasks: options.getTasks,
        }),
      ],
      defaultKeymap: true,
      icons: true,
    }),
    createWikilinkInputHandler(),
    createTagInputHandler(),
  ];
}
