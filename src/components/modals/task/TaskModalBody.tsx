import React, { useRef, useState, useMemo } from 'react';
import {
  TextInput,
  Tabs,
  Stack,
  Group,
  Text,
  Button,
  Paper,
} from '@mantine/core';
import {
  IconListCheck,
  IconEdit,
  IconEye,
  IconPhoto,
} from '@tabler/icons-react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTranslation } from 'react-i18next';
import {
  AreaDefinition,
  ProjectDefinition,
  KanbanColumnConfig,
  TagDefinition,
  TaskPriority,
  TaskStatus,
} from '../../../types';
import { TaskChecklistProgress } from '../../tasks/TaskChecklistProgress';
import { TaskPropertiesForm } from '../../tasks/TaskPropertiesForm';
import { MarkdownViewer } from '../../viewer/MarkdownViewer';
import { createTagAutocompleteExtension } from '../../editor/tagAutocompleteExtension';
import { liveMarkdownExtension } from '../../editor/liveMarkdownExtension';

export interface TaskModalBodyProps {
  title: string;
  onTitleChange: (val: string) => void;
  activeTab: 'details' | 'description' | 'preview';
  onTabChange: (tab: 'details' | 'description' | 'preview') => void;
  content: string;
  onContentChange: (val: string) => void;
  area: string;
  onAreaChange: (val: string) => void;
  project: string | null;
  onProjectChange: (val: string | null) => void;
  status: TaskStatus;
  onStatusChange: (val: TaskStatus) => void;
  priority: TaskPriority;
  onPriorityChange: (val: TaskPriority) => void;
  dueDate: Date | null;
  onDueDateChange: (val: Date | null) => void;
  startedDate: Date | null;
  onStartedDateChange: (val: Date | null) => void;
  completedDate: Date | null;
  onCompletedDateChange: (val: Date | null) => void;
  tags: string[];
  onTagsChange: (val: string[]) => void;
  areas: AreaDefinition[];
  projects: ProjectDefinition[];
  availableColumns: KanbanColumnConfig[];
  allTags: TagDefinition[];
  isDark: boolean;
  onProcessImageFiles?: (files: FileList | File[]) => void;
}

export const TaskModalBody: React.FC<TaskModalBodyProps> = ({
  title,
  onTitleChange,
  activeTab,
  onTabChange,
  content,
  onContentChange,
  area,
  onAreaChange,
  project,
  onProjectChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  dueDate,
  onDueDateChange,
  startedDate,
  onStartedDateChange,
  completedDate,
  onCompletedDateChange,
  tags,
  onTagsChange,
  areas,
  projects,
  availableColumns,
  allTags,
  isDark,
  onProcessImageFiles,
}) => {
  const { t } = useTranslation();
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const allTagsRef = useRef(allTags);
  allTagsRef.current = allTags;

  const extensions = useMemo(() => {
    return [
      markdown({ extensions: GFM }),
      createTagAutocompleteExtension(() => allTagsRef.current),
      liveMarkdownExtension({
        copyCode: t('editor.copyCode'),
        editTable: t('editor.editTable'),
        imageNotFound: t('editor.imageNotFound'),
        toggleTask: t('editor.toggleTask'),
      }),
    ];
  }, [t]);

  return (
    <Stack gap="md">
      <TextInput
        label={t('tasks.taskTitle', 'Task Title')}
        placeholder={t('tasks.titlePlaceholder', 'What needs to be done?')}
        value={title}
        onChange={(e) => onTitleChange(e.currentTarget.value)}
        required
        autoFocus
        radius="md"
      />

      <Tabs
        value={activeTab}
        onChange={(val) => val && onTabChange(val as 'details' | 'description' | 'preview')}
        radius="md"
      >
        <Tabs.List mb="sm">
          <Tabs.Tab value="details" leftSection={<IconListCheck size={15} />}>
            {t('tasks.details', 'Details')}
          </Tabs.Tab>
          <Tabs.Tab value="description" leftSection={<IconEdit size={15} />}>
            {t('tasks.description', 'Description')}
          </Tabs.Tab>
          <Tabs.Tab value="preview" leftSection={<IconEye size={15} />}>
            {t('editor.preview')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="details">
          <Stack gap="md">
            <TaskChecklistProgress content={content} />
            <TaskPropertiesForm
              area={area}
              onAreaChange={onAreaChange}
              project={project}
              onProjectChange={onProjectChange}
              status={status}
              onStatusChange={onStatusChange}
              priority={priority}
              onPriorityChange={onPriorityChange}
              dueDate={dueDate}
              onDueDateChange={onDueDateChange}
              startedDate={startedDate}
              onStartedDateChange={onStartedDateChange}
              completedDate={completedDate}
              onCompletedDateChange={onCompletedDateChange}
              tags={tags}
              onTagsChange={onTagsChange}
              areas={areas}
              projects={projects}
              availableColumns={availableColumns}
              allTags={allTags}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="description">
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="xs" c="dimmed">
                {t('tasks.descriptionHelp', 'Markdown supported. You can drop images or checklists here.')}
              </Text>
              <Button
                variant="subtle"
                size="compact-xs"
                leftSection={<IconPhoto size={13} />}
                onClick={async () => {
                  if (!window.electronAPI) return;
                  const res = await window.electronAPI.selectImageDialog();
                  if (res.success && res.relativePath) {
                    onContentChange(`${content}\n![${res.filename || 'Image'}](${res.relativePath})\n`);
                  }
                }}
              >
                {t('editor.insertImage')}
              </Button>
            </Group>

            <Paper
              withBorder
              radius="md"
              p={4}
              style={{
                backgroundColor: isDark ? 'var(--mantine-color-dark-8)' : 'var(--mantine-color-gray-0)',
                borderColor: isDraggingOver ? 'var(--mantine-primary-color-filled)' : undefined,
                minHeight: 240,
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files && onProcessImageFiles) {
                  onProcessImageFiles(e.dataTransfer.files);
                }
              }}
            >
              <CodeMirror
                ref={editorRef}
                value={content}
                height="240px"
                theme={isDark ? oneDark : 'light'}
                extensions={extensions}
                onChange={(val) => onContentChange(val)}
                placeholder={t('tasks.contentPlaceholder')}
              />
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="preview">
          <Paper withBorder p="md" radius="md" style={{ minHeight: 240, maxHeight: 360, overflowY: 'auto' }}>
            <MarkdownViewer content={content || `*${t('editor.emptyNote')}*`} />
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
