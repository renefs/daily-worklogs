import { Completion } from '@codemirror/autocomplete';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/** Completion option that carries the color of the tag it inserts */
export interface TagCompletion extends Completion {
  tagColor: string;
}

function isTagCompletion(completion: Completion): completion is TagCompletion {
  return typeof (completion as Partial<TagCompletion>).tagColor === 'string';
}

function resolveColorValue(color: string): string {
  return color.startsWith('#') ? color : `var(--mantine-color-${color}-6)`;
}

const svgMask = (paths: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${paths}</svg>`
  )}")`;

// Tabler icon outlines: calendar and square-check
const NOTE_ICON = svgMask(
  "<path d='M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z'/><path d='M16 3v4M8 3v4M4 11h16'/>"
);
const TASK_ICON = svgMask(
  "<path d='M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><path d='m9 12 2 2 4-4'/>"
);

/**
 * Renders the leading icon of a completion option: a colored dot for tags,
 * an outline icon for daily notes and tasks
 */
export const completionIconOption = {
  render(completion: Completion): Node | null {
    const icon = document.createElement('span');
    icon.className = 'cm-app-completionIcon';
    icon.setAttribute('aria-hidden', 'true');
    if (isTagCompletion(completion)) {
      icon.classList.add('cm-app-completionIcon-tag');
      icon.style.setProperty('--cm-app-completion-dot', resolveColorValue(completion.tagColor));
    } else if (completion.type === 'note' || completion.type === 'task') {
      icon.classList.add(`cm-app-completionIcon-${completion.type}`);
    }
    return icon;
  },
  position: 20,
};

/** Shared autocompletion display options used by every editor */
export const completionDisplayConfig = {
  icons: false,
  addToOptions: [completionIconOption],
};

/**
 * Popup theme matching the Mantine surfaces of the app in light and dark mode
 */
export const completionTheme: Extension = EditorView.theme({
  '.cm-tooltip.cm-tooltip-autocomplete': {
    backgroundColor: 'var(--app-card-bg)',
    border: '1px solid var(--app-card-border)',
    borderRadius: '10px',
    boxShadow: 'var(--mantine-shadow-md)',
    padding: '4px',
    overflow: 'hidden',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    minWidth: '220px',
    maxHeight: '17em',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    lineHeight: '1.3',
    borderRadius: '6px',
    color: 'var(--app-text-primary)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li:hover': {
    backgroundColor: 'var(--mantine-color-default-hover)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--mantine-primary-color-light)',
    color: 'var(--app-text-primary)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected] .cm-completionMatchedText': {
    color: 'var(--mantine-primary-color-light-color)',
  },
  '.cm-completionLabel': {
    flex: '1 1 auto',
    minWidth: '0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  '.cm-completionMatchedText': {
    textDecoration: 'none',
    fontWeight: '600',
    color: 'var(--mantine-primary-color-filled)',
  },
  '.cm-completionDetail': {
    flex: '0 1 auto',
    marginLeft: '12px',
    fontStyle: 'normal',
    fontSize: '12px',
    color: 'var(--app-text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  '.cm-app-completionIcon': {
    flex: '0 0 auto',
    width: '14px',
    height: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  '.cm-app-completionIcon-tag::after': {
    content: '""',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--cm-app-completion-dot)',
  },
  '.cm-app-completionIcon-note, .cm-app-completionIcon-task': {
    backgroundColor: 'var(--app-text-secondary)',
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
  },
  '.cm-app-completionIcon-note': {
    maskImage: NOTE_ICON,
    WebkitMaskImage: NOTE_ICON,
  },
  '.cm-app-completionIcon-task': {
    maskImage: TASK_ICON,
    WebkitMaskImage: TASK_ICON,
  },
  '.cm-tooltip-autocomplete .cm-completionListIncompleteTop:before, .cm-tooltip-autocomplete .cm-completionListIncompleteBottom:after': {
    color: 'var(--app-text-secondary)',
  },
});
