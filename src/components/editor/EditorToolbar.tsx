import React from 'react';
import {
  Group,
  ActionIcon,
  Tooltip,
  Divider,
} from '@mantine/core';
import {
  IconBold,
  IconItalic,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconCheckbox,
  IconCode,
  IconTable,
  IconPhoto,
  IconNotes,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export interface EditorToolbarProps {
  onInsertText: (before: string, after?: string, defaultText?: string) => void;
  onInsertTable: () => void;
  onInsertImage: () => void;
  /** Show the "Add notes section" button (daily note editor only). */
  showNotesSection?: boolean;
  /** True when the note already has a Notes section; the button is then inert. */
  notesSectionExists?: boolean;
  onAddNotesSection?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onInsertText,
  onInsertTable,
  onInsertImage,
  showNotesSection = false,
  notesSectionExists = false,
  onAddNotesSection,
}) => {
  const { t } = useTranslation();

  return (
    <Group gap={3} wrap="nowrap" style={{ overflowX: 'auto' }}>
      <Tooltip label={t('editor.bold')} withArrow>
        <ActionIcon
          aria-label={t('editor.bold')}
          variant="subtle"
          size="sm"
          onClick={() => onInsertText('**', '**', 'bold')}
        >
          <IconBold size={15} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t('editor.italic')} withArrow>
        <ActionIcon
          aria-label={t('editor.italic')}
          variant="subtle"
          size="sm"
          onClick={() => onInsertText('*', '*', 'italic')}
        >
          <IconItalic size={15} />
        </ActionIcon>
      </Tooltip>
      <Divider orientation="vertical" />
      <Tooltip label={t('editor.headingLevel', { level: 1 })} withArrow>
        <ActionIcon
          aria-label={t('editor.headingLevel', { level: 1 })}
          variant="subtle"
          size="sm"
          onClick={() => onInsertText('\n# ', '\n')}
        >
          <IconH1 size={15} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t('editor.headingLevel', { level: 2 })} withArrow>
        <ActionIcon
          aria-label={t('editor.headingLevel', { level: 2 })}
          variant="subtle"
          size="sm"
          onClick={() => onInsertText('\n## ', '\n')}
        >
          <IconH2 size={15} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t('editor.headingLevel', { level: 3 })} withArrow>
        <ActionIcon
          aria-label={t('editor.headingLevel', { level: 3 })}
          variant="subtle"
          size="sm"
          onClick={() => onInsertText('\n### ', '\n')}
        >
          <IconH3 size={15} />
        </ActionIcon>
      </Tooltip>
      <Divider orientation="vertical" />
      <Tooltip label={t('editor.bulletList')} withArrow>
        <ActionIcon
          aria-label={t('editor.bulletList')}
          variant="subtle"
          size="sm"
          onClick={() => onInsertText('\n- ', '')}
        >
          <IconList size={15} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t('editor.numberedList')} withArrow>
        <ActionIcon
          aria-label={t('editor.numberedList')}
          variant="subtle"
          size="sm"
          onClick={() => onInsertText('\n1. ', '')}
        >
          <IconListNumbers size={15} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t('editor.task')} withArrow>
        <ActionIcon
          aria-label={t('editor.task')}
          variant="subtle"
          size="sm"
          onClick={() => onInsertText('\n- [ ] ', '')}
        >
          <IconCheckbox size={15} />
        </ActionIcon>
      </Tooltip>
      <Divider orientation="vertical" />
      <Tooltip label={t('editor.code')} withArrow>
        <ActionIcon
          aria-label={t('editor.code')}
          variant="subtle"
          size="sm"
          onClick={() => onInsertText('```\n', '\n```\n')}
        >
          <IconCode size={15} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t('editor.table')} withArrow>
        <ActionIcon
          aria-label={t('editor.table')}
          variant="subtle"
          size="sm"
          onClick={onInsertTable}
        >
          <IconTable size={15} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t('editor.insertImage') || 'Insert Image'} withArrow>
        <ActionIcon
          aria-label={t('editor.insertImage')}
          variant="subtle"
          size="sm"
          onClick={onInsertImage}
        >
          <IconPhoto size={15} />
        </ActionIcon>
      </Tooltip>

      {showNotesSection && onAddNotesSection && (
        <Tooltip
          label={notesSectionExists ? t('editor.notesSectionExists') : t('editor.addNotesSection')}
          withArrow
        >
          {/* data-disabled instead of disabled keeps pointer events so the tooltip still shows */}
          <ActionIcon
            aria-label={t('editor.addNotesSection')}
            aria-disabled={notesSectionExists}
            data-disabled={notesSectionExists || undefined}
            variant="subtle"
            size="sm"
            onClick={notesSectionExists ? undefined : onAddNotesSection}
          >
            <IconNotes size={15} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
};
