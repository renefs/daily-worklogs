import React, { useRef, useCallback, useEffect } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  Group,
  ActionIcon,
  Tooltip,
  Paper,
  Divider,
  Menu,
  Button,
  Badge,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconBold,
  IconItalic,
  IconH1,
  IconH2,
  IconH3,
  IconCheckbox,
  IconList,
  IconListNumbers,
  IconCode,
  IconTable,
  IconTemplate,
  IconCheck,
  IconDeviceFloppy,
  IconTrash,
  IconFileExport,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';

import { EditorView } from '@codemirror/view';
import { liveMarkdownExtension } from './liveMarkdownExtension';

interface MarkdownEditorProps {
  onExportClick?: () => void;
  onDeleteClick?: () => void;
  isLivePreview?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  onExportClick,
  onDeleteClick,
  isLivePreview = true,
}) => {
  const { t } = useTranslation();
  const { colorScheme } = useMantineColorScheme();
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const {
    activeNote,
    setNoteContent,
    saveActiveNote,
    isSaving,
    isDirty,
    settings,
    applyTemplate,
  } = useAppStore();

  const isDark = colorScheme === 'dark';

  // Auto-save debounce timer
  useEffect(() => {
    if (!settings?.autoSave || !isDirty || !activeNote) return;

    const timer = setTimeout(() => {
      saveActiveNote();
    }, settings.autoSaveDelay || 1000);

    return () => clearTimeout(timer);
  }, [activeNote?.content, isDirty, settings?.autoSave, settings?.autoSaveDelay, saveActiveNote]);

  // Insert text helper
  const insertText = useCallback((before: string, after: string = '', defaultText: string = '') => {
    const view = editorRef.current?.view;
    if (!view) return;

    const selection = view.state.selection.main;
    const selectedText = view.state.sliceDoc(selection.from, selection.to) || defaultText;
    const replacement = `${before}${selectedText}${after}`;

    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: replacement },
      selection: {
        anchor: selection.from + before.length,
        head: selection.from + before.length + selectedText.length,
      },
    });
    view.focus();
  }, []);

  const insertTable = () => {
    const tableTemplate = `\n| Item | Description | Status |\n| --- | --- | --- |\n| Task 1 | Details | Done |\n| Task 2 | Details | Pending |\n\n`;
    insertText('', '', tableTemplate);
  };

  const wordCount = (activeNote?.content || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const charCount = (activeNote?.content || '').length;

  const extensions = React.useMemo(() => {
    const list = [markdown(), EditorView.lineWrapping];
    if (isLivePreview) {
      list.push(...liveMarkdownExtension());
    }
    return list;
  }, [isLivePreview]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Editor Toolbar */}
      <Paper
        p="xs"
        withBorder
        style={{
          borderRadius: '8px 8px 0 0',
          borderBottom: 'none',
          backgroundColor: isDark ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)',
        }}
      >
        <Group justify="space-between" gap="xs">
          <Group gap={4}>
            <Tooltip label={t('editor.bold')} withArrow>
              <ActionIcon variant="subtle" size="sm" onClick={() => insertText('**', '**', 'bold')}>
                <IconBold size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('editor.italic')} withArrow>
              <ActionIcon variant="subtle" size="sm" onClick={() => insertText('*', '*', 'italic')}>
                <IconItalic size={16} />
              </ActionIcon>
            </Tooltip>
            <Divider orientation="vertical" />
            <Tooltip label="Heading 1" withArrow>
              <ActionIcon variant="subtle" size="sm" onClick={() => insertText('\n# ', '\n')}>
                <IconH1 size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Heading 2" withArrow>
              <ActionIcon variant="subtle" size="sm" onClick={() => insertText('\n## ', '\n')}>
                <IconH2 size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Heading 3" withArrow>
              <ActionIcon variant="subtle" size="sm" onClick={() => insertText('\n### ', '\n')}>
                <IconH3 size={16} />
              </ActionIcon>
            </Tooltip>
            <Divider orientation="vertical" />
            <Tooltip label={t('editor.task')} withArrow>
              <ActionIcon variant="subtle" size="sm" onClick={() => insertText('\n- [ ] ', '')}>
                <IconCheckbox size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Bullet List" withArrow>
              <ActionIcon variant="subtle" size="sm" onClick={() => insertText('\n- ', '')}>
                <IconList size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Numbered List" withArrow>
              <ActionIcon variant="subtle" size="sm" onClick={() => insertText('\n1. ', '')}>
                <IconListNumbers size={16} />
              </ActionIcon>
            </Tooltip>
            <Divider orientation="vertical" />
            <Tooltip label={t('editor.code')} withArrow>
              <ActionIcon variant="subtle" size="sm" onClick={() => insertText('```\n', '\n```\n')}>
                <IconCode size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('editor.table')} withArrow>
              <ActionIcon variant="subtle" size="sm" onClick={insertTable}>
                <IconTable size={16} />
              </ActionIcon>
            </Tooltip>

            {/* Template Selector */}
            <Menu shadow="md" width={220}>
              <Menu.Target>
                <Button
                  variant="subtle"
                  size="compact-xs"
                  leftSection={<IconTemplate size={14} />}
                  style={{ marginLeft: 4 }}
                >
                  {t('editor.chooseTemplate')}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t('settings.templates')}</Menu.Label>
                {settings?.templates.map((tpl) => (
                  <Menu.Item key={tpl.id} onClick={() => applyTemplate(tpl.id)}>
                    {tpl.name}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </Group>

          {/* Right Action Icons & Save Status */}
          <Group gap="xs">
            {isLivePreview && (
              <Badge color="violet" variant="light" size="sm">
                {t('editor.live')}
              </Badge>
            )}

            {isDirty ? (
              <Badge color="yellow" variant="light" size="sm">
                {t('editor.unsaved')}
              </Badge>
            ) : isSaving ? (
              <Badge color="blue" variant="light" size="sm">
                {t('editor.saving')}
              </Badge>
            ) : (
              <Badge color="green" variant="subtle" size="sm" leftSection={<IconCheck size={12} />}>
                {t('editor.saved')}
              </Badge>
            )}

            <Tooltip label={t('common.save')} withArrow>
              <ActionIcon
                variant={isDirty ? 'filled' : 'light'}
                color="primary"
                size="sm"
                onClick={saveActiveNote}
                loading={isSaving}
              >
                <IconDeviceFloppy size={16} />
              </ActionIcon>
            </Tooltip>

            {onExportClick && (
              <Tooltip label={t('editor.exportNote')} withArrow>
                <ActionIcon variant="subtle" size="sm" onClick={onExportClick}>
                  <IconFileExport size={16} />
                </ActionIcon>
              </Tooltip>
            )}

            {onDeleteClick && activeNote?.exists && (
              <Tooltip label={t('editor.deleteNote')} withArrow>
                <ActionIcon variant="subtle" color="red" size="sm" onClick={onDeleteClick}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Paper>

      {/* CodeMirror Editor Area */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: '0 0 8px 8px',
          backgroundColor: isDark ? '#141517' : '#ffffff',
          fontSize: `${settings?.editorFontSize || 15}px`,
        }}
      >
        <CodeMirror
          ref={editorRef}
          value={activeNote?.content || ''}
          height="100%"
          theme={isDark ? oneDark : 'light'}
          extensions={extensions}
          onChange={(val) => setNoteContent(val)}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
          }}
          style={{ height: '100%' }}
        />
      </div>

      {/* Footer Info Bar */}
      <Group justify="space-between" px="xs" py={4} mt={4}>
        <Group gap="md">
          <Text size="xs" c="dimmed">
            {wordCount} {t('editor.words')}
          </Text>
          <Text size="xs" c="dimmed">
            {charCount} {t('editor.characters')}
          </Text>
          {activeNote && activeNote.tasksTotal !== undefined && activeNote.tasksTotal > 0 && (
            <Text size="xs" c="dimmed">
              🎯 {activeNote.tasksCompleted}/{activeNote.tasksTotal} {t('editor.tasksCompleted')}
            </Text>
          )}
        </Group>
        {!activeNote?.exists && (
          <Text size="xs" c="dimmed" fs="italic">
            {t('editor.newNoteNotice')}
          </Text>
        )}
      </Group>
    </div>
  );
};
