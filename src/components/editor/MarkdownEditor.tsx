import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { GFM } from '@lezer/markdown';
import {
  Group,
  Paper,
  Text,
  useComputedColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useAppStoreSelector } from '../../store/useAppStore';
import { formatTemplateContent } from '../../utils/dateTemplate';
import { EditorView, keymap } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import { liveMarkdownExtension } from './liveMarkdownExtension';
import { createTagAutocompleteExtension } from './tagAutocompleteExtension';
import { EditorToolbar } from './EditorToolbar';
import { EditorHeaderActions } from './EditorHeaderActions';
import classes from './MarkdownEditor.module.css';

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
  onSave?: () => Promise<unknown> | unknown;
  isSaving?: boolean;
  isDirty?: boolean;
  onExportClick?: () => void;
  onDeleteClick?: () => void;
  isLivePreview?: boolean;
  layoutMode?: 'live' | 'split' | 'edit' | 'preview';
  onLayoutModeChange?: (mode: 'live' | 'split' | 'edit' | 'preview') => void;
  showTemplates?: boolean;
  showDelete?: boolean;
  showExport?: boolean;
  placeholder?: string;
  tasksStats?: { total: number; completed: number };
  showStatusAndActions?: boolean;
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
  layoutMode,
  onLayoutModeChange,
  showTemplates = true,
  showDelete = true,
  showExport = true,
  showStatusAndActions = true,
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
    noteSaveError,
    settings,
    selectedDate,
    allTags,
  } = useAppStoreSelector((state) => ({
    activeNote: state.activeNote,
    setNoteContent: state.setNoteContent,
    saveActiveNote: state.saveActiveNote,
    isSaving: state.isSaving,
    isDirty: state.isDirty,
    noteSaveError: state.noteSaveError,
    settings: state.settings,
    selectedDate: state.selectedDate,
    allTags: state.allTags,
  }));

  const isControlled = content !== undefined;
  const effectiveContent = isControlled ? content : activeNote?.content || '';
  const effectiveOnChange = isControlled ? (onChange || (() => {})) : setNoteContent;
  const effectiveOnSave = isControlled ? (onSave || (() => {})) : saveActiveNote;
  const effectiveIsSaving = customIsSaving !== undefined ? customIsSaving : storeIsSaving;
  const effectiveIsDirty = customIsDirty !== undefined ? customIsDirty : storeIsDirty;
  const effectiveSaveError = isControlled ? null : noteSaveError;
  const [showSavedConfirmation, setShowSavedConfirmation] = React.useState(false);
  const wasSavingRef = useRef(false);

  useEffect(() => {
    const saveJustFinished = wasSavingRef.current && !effectiveIsSaving;
    wasSavingRef.current = effectiveIsSaving;
    if (!saveJustFinished || effectiveIsDirty || effectiveSaveError) return;

    setShowSavedConfirmation(true);
    const timer = window.setTimeout(() => setShowSavedConfirmation(false), 2000);
    return () => window.clearTimeout(timer);
  }, [effectiveIsDirty, effectiveIsSaving, effectiveSaveError]);

  const allTagsRef = useRef(allTags);
  useEffect(() => {
    allTagsRef.current = allTags;
  }, [allTags]);

  const isDark = computedColorScheme === 'dark';

  // Insert text helper
  const insertText = useCallback((before: string, after: string = '', defaultText: string = '') => {
    const view = editorRef.current?.view;
    if (!view) return;

    const transaction = view.state.changeByRange((selection) => {
      const selectedText = view.state.sliceDoc(selection.from, selection.to) || defaultText;
      return {
        changes: { from: selection.from, to: selection.to, insert: `${before}${selectedText}${after}` },
        range: EditorSelection.range(
          selection.from + before.length,
          selection.from + before.length + selectedText.length
        ),
      };
    });
    view.dispatch(transaction);
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
    } catch (err: unknown) {
      console.error('Error selecting image:', err);
      notifications.show({
        title: t('common.error') || 'Error',
        message: err instanceof Error ? err.message : t('editor.imageSaveFailed'),
        color: 'red',
      });
    }
  };

  const processImageFiles = async (files: FileList | File[]) => {
    let inserted = 0;
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/') && !/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(file.name)) {
        continue;
      }
      try {
        const buffer = await file.arrayBuffer();
        const res = await window.electronAPI.saveImage({
          buffer,
          originalName: file.name,
          mimeType: file.type,
        });
        if (res.success && res.relativePath) {
          insertText(`\n![${res.filename || file.name}](${res.relativePath})\n`);
          inserted++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error('Failed to import dragged/pasted image:', err);
        failed++;
      }
    }

    if (inserted > 0) {
      notifications.show({
        title: t('editor.imageSaved') || 'Images Added',
        message: `${inserted} image(s) attached.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    }
    if (failed > 0) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: `Failed to import ${failed} image(s).`,
        color: 'red',
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      if (!isDraggingOver) setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      await processImageFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      const hasImages = Array.from(e.clipboardData.files).some((f) =>
        f.type.startsWith('image/')
      );
      if (hasImages) {
        e.preventDefault();
        await processImageFiles(e.clipboardData.files);
      }
    }
  };

  const handleManualSave = async () => {
    if (isControlled) {
      await effectiveOnSave();
      notifications.show({
        id: 'manual-save',
        title: t('editor.saved') || 'All changes saved',
        message: t('editor.fileSaved') || 'File saved successfully',
        color: 'teal',
        icon: <IconCheck size={16} />,
        autoClose: 2000,
      });
    } else {
      window.dispatchEvent(new CustomEvent('app:save'));
    }
  };

  // Compute words and characters
  const wordCount = useMemo(() => {
    const text = (effectiveContent || '').trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }, [effectiveContent]);

  const charCount = effectiveContent ? effectiveContent.length : 0;

  const extensions = useMemo(() => {
    const list = [
      markdown({ extensions: GFM }),
      syntaxHighlighting(editorHighlightStyle, { fallback: true }),
      createTagAutocompleteExtension(() => allTagsRef.current),
      keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            window.dispatchEvent(new CustomEvent('app:save'));
            return true;
          },
        },
      ]),
      EditorView.lineWrapping,
    ];
    if (isLivePreview) {
      list.push(
        ...liveMarkdownExtension({
          copyCode: t('editor.copyCode'),
          editTable: t('editor.editTable'),
          imageNotFound: t('editor.imageNotFound'),
          toggleTask: t('editor.toggleTask'),
        })
      );
    }
    return list;
  }, [isLivePreview, t]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Editor Toolbar & Header Actions */}
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
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <EditorToolbar
            onInsertText={insertText}
            onInsertTable={insertTable}
            onInsertImage={handleInsertImage}
            showTemplates={showTemplates}
            templates={settings?.templates}
            onInsertTemplate={insertTemplate}
          />

          {showStatusAndActions && (
            <EditorHeaderActions
              layoutMode={layoutMode}
              onLayoutModeChange={onLayoutModeChange}
              isSaving={effectiveIsSaving}
              isDirty={effectiveIsDirty}
              saveError={effectiveSaveError}
              showSavedConfirmation={showSavedConfirmation}
              onSave={handleManualSave}
              showExport={showExport}
              onExportClick={onExportClick}
              showDelete={showDelete && Boolean(isControlled || activeNote?.exists)}
              onDeleteClick={onDeleteClick}
            />
          )}
        </Group>
      </Paper>

      {/* CodeMirror Editor Area */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={isDraggingOver ? clsx(classes.editorDropzoneActive, 'editor-dropzone-active') : undefined}
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
            lineNumbers: layoutMode === 'edit',
            foldGutter: layoutMode === 'edit',
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
