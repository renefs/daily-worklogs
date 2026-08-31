import React, { useRef, useCallback, useEffect } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
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
  useComputedColorScheme,
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
  IconPhoto,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { formatTemplateContent } from '../../utils/dateTemplate';

import { EditorView } from '@codemirror/view';
import { liveMarkdownExtension } from './liveMarkdownExtension';
import { createTagAutocompleteExtension } from './tagAutocompleteExtension';

/**
 * Unified syntax highlighting style matching Mantine light and dark themes
 */
const editorHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--cm-hl-keyword, #cf222e)', fontWeight: '600' },
  { tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName], color: 'var(--cm-hl-name, #0550ae)' },
  { tag: [tags.function(tags.variableName), tags.labelName], color: 'var(--cm-hl-function, #8250df)' },
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: 'var(--cm-hl-constant, #0550ae)' },
  { tag: [tags.definition(tags.name), tags.separator], color: 'var(--cm-hl-definition, #24292f)' },
  { tag: [tags.typeName, tags.className, tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace], color: 'var(--cm-hl-type, #953800)' },
  { tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link, tags.special(tags.string)], color: 'var(--cm-hl-operator, #0a3069)' },
  { tag: [tags.meta, tags.comment], color: 'var(--cm-hl-comment, #6e7781)', fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: 'var(--cm-hl-link, #0969da)', textDecoration: 'underline' },
  { tag: tags.heading, fontWeight: 'bold', color: 'var(--cm-hl-heading, #0550ae)' },
  { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: 'var(--cm-hl-atom, #cf222e)' },
  { tag: [tags.processingInstruction, tags.string, tags.inserted], color: 'var(--cm-hl-string, #0a7b45)' },
  { tag: tags.invalid, color: 'var(--cm-hl-invalid, #82071e)' },
]);

export interface MarkdownEditorProps {
  content?: string;
  onChange?: (val: string) => void;
  onSave?: () => Promise<any> | any;
  isSaving?: boolean;
  isDirty?: boolean;
  onExportClick?: () => void;
  onDeleteClick?: () => void;
  isLivePreview?: boolean;
  showTemplates?: boolean;
  showDelete?: boolean;
  showExport?: boolean;
  placeholder?: string;
  tasksStats?: { total: number; completed: number };
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  onChange,
  onSave,
  isSaving: customIsSaving,
  isDirty: customIsDirty,
  onExportClick,
  onDeleteClick,
  isLivePreview = true,
  showTemplates = true,
  placeholder,
  tasksStats,
}) => {
  const { t, i18n } = useTranslation();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

  const {
    activeNote,
    setNoteContent,
    saveActiveNote,
    isSaving: storeIsSaving,
    isDirty: storeIsDirty,
    settings,
    selectedDate,
    allTags,
  } = useAppStore();

  const isControlled = content !== undefined;
  const effectiveContent = isControlled ? content : activeNote?.content || '';
  const effectiveOnChange = isControlled ? (onChange || (() => {})) : setNoteContent;
  const effectiveOnSave = isControlled ? (onSave || (() => {})) : saveActiveNote;
  const effectiveIsSaving = customIsSaving !== undefined ? customIsSaving : storeIsSaving;
  const effectiveIsDirty = customIsDirty !== undefined ? customIsDirty : storeIsDirty;

  const allTagsRef = useRef(allTags);
  useEffect(() => {
    allTagsRef.current = allTags;
  }, [allTags]);

  const isDark = computedColorScheme === 'dark';

  // Auto-save debounce timer
  useEffect(() => {
    if (!settings?.autoSave || !effectiveIsDirty) return;
    if (!isControlled && !activeNote) return;

    const timer = setTimeout(() => {
      effectiveOnSave();
    }, settings.autoSaveDelay || 1000);

    return () => clearTimeout(timer);
  }, [effectiveContent, effectiveIsDirty, settings?.autoSave, settings?.autoSaveDelay, effectiveOnSave, isControlled, activeNote]);

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

  const insertTemplate = useCallback(
    (templateId: string) => {
      if (!settings) return;
      const template = settings.templates.find((t) => t.id === templateId);
      if (!template) return;

      const processedContent = formatTemplateContent(
        template.content,
        selectedDate,
        settings.dateFormat,
        settings.language || (i18n.language === 'es' ? 'es' : 'en')
      );
      const view = editorRef.current?.view;
      if (view) {
        const selection = view.state.selection.main;
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: processedContent },
          selection: {
            anchor: selection.from + processedContent.length,
            head: selection.from + processedContent.length,
          },
        });
        view.focus();
      } else {
        const current = effectiveContent || '';
        effectiveOnChange(current ? `${current}\n\n${processedContent}` : processedContent);
      }
    },
    [settings, selectedDate, effectiveContent, effectiveOnChange, i18n.language]
  );

  const insertTable = () => {
    const tableTemplate = `\n| Item | Description | Status |\n| --- | --- | --- |\n| Task 1 | Details | Done |\n| Task 2 | Details | Pending |\n\n`;
    insertText('', '', tableTemplate);
  };

  const handleInsertImage = async () => {
    try {
      const res = await window.electronAPI.selectImageDialog();
      if (res.success && res.relativePath) {
        insertText(`\n![${res.filename || 'Image'}](${res.relativePath})\n`);
        notifications.show({
          title: t('editor.imageSaved') || 'Image Added',
          message: res.filename,
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
      }
    } catch (err: any) {
      console.error('Error selecting image:', err);
      notifications.show({
        title: t('common.error') || 'Error',
        message: err?.message || 'Failed to insert image',
        color: 'red',
      });
    }
  };

  const processImageFiles = async (files: FileList | File[]) => {
    let inserted = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/') && !/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(file.name)) {
        continue;
      }

      try {
        const buffer = await file.arrayBuffer();
        const sourcePath = (file as any).path;
        const res = await window.electronAPI.saveImage({
          sourcePath,
          buffer,
          originalName: file.name,
          mimeType: file.type,
        });

        if (res.success && res.relativePath) {
          insertText(`\n![${res.filename || file.name}](${res.relativePath})\n`);
          inserted++;
        }
      } catch (err) {
        console.error('Error saving dropped/pasted image:', err);
      }
    }

    if (inserted > 0) {
      notifications.show({
        title: t('editor.imageSaved') || 'Image Added',
        message: `${inserted} ${t('editor.imagesSavedMessage') || 'image(s) saved to vault'}`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const hasImage = Array.from(e.dataTransfer.files).some(
        (f) => f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(f.name)
      );
      if (hasImage) {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        await processImageFiles(e.dataTransfer.files);
      }
    }
    setIsDraggingOver(false);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      await processImageFiles(imageFiles);
    }
  };

  const wordCount = effectiveContent
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const charCount = effectiveContent.length;

  const extensions = React.useMemo(() => {
    const list = [
      markdown({ codeLanguages: languages }),
      syntaxHighlighting(editorHighlightStyle, { fallback: true }),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      createTagAutocompleteExtension(() => allTagsRef.current),
      EditorView.lineWrapping,
    ];
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
          backgroundColor: 'var(--app-subtle-bg)',
          borderColor: 'var(--app-card-border)',
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
            <Tooltip label={t('editor.insertImage') || 'Insert Image'} withArrow>
              <ActionIcon variant="subtle" size="sm" onClick={handleInsertImage}>
                <IconPhoto size={16} />
              </ActionIcon>
            </Tooltip>

            {/* Template Selector (only if enabled) */}
            {showTemplates && settings?.templates && settings.templates.length > 0 && (
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
                  {settings.templates.map((tpl) => (
                    <Menu.Item key={tpl.id} onClick={() => insertTemplate(tpl.id)}>
                      {tpl.name}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>

          {/* Right Action Icons & Save Status */}
          <Group gap="xs">
            {isLivePreview && (
              <Badge color="violet" variant="light" size="sm">
                {t('editor.live')}
              </Badge>
            )}

            {effectiveIsDirty ? (
              <Badge color="yellow" variant="light" size="sm">
                {t('editor.unsaved')}
              </Badge>
            ) : effectiveIsSaving ? (
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
                variant={effectiveIsDirty ? 'filled' : 'light'}
                color="primary"
                size="sm"
                onClick={effectiveOnSave}
                loading={effectiveIsSaving}
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

            {onDeleteClick && (isControlled || activeNote?.exists) && (
              <Tooltip label={t('common.delete')} withArrow>
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
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={isDraggingOver ? 'editor-dropzone-active' : ''}
        style={{
          flex: 1,
          overflow: 'hidden',
          border: '1px solid var(--app-card-border)',
          borderRadius: '0 0 8px 8px',
          backgroundColor: 'var(--app-card-bg)',
          fontSize: `${settings?.editorFontSize || 15}px`,
        }}
      >
        <CodeMirror
          ref={editorRef}
          value={effectiveContent}
          height="100%"
          theme={isDark ? oneDark : 'light'}
          extensions={extensions}
          onChange={(val) => effectiveOnChange(val)}
          placeholder={placeholder}
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
          {tasksStats && tasksStats.total > 0 && (
            <Text size="xs" c="dimmed">
              🎯 {tasksStats.completed}/{tasksStats.total} {t('editor.tasksCompleted')}
            </Text>
          )}
          {!isControlled && activeNote && activeNote.tasksTotal !== undefined && activeNote.tasksTotal > 0 && (
            <Text size="xs" c="dimmed">
              🎯 {activeNote.tasksCompleted}/{activeNote.tasksTotal} {t('editor.tasksCompleted')}
            </Text>
          )}
        </Group>
        {!isControlled && !activeNote?.exists && (
          <Text size="xs" c="dimmed" fs="italic">
            {t('editor.newNoteNotice')}
          </Text>
        )}
      </Group>
    </div>
  );
};
