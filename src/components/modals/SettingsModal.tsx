import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Stack,
  Group,
  Text,
  Button,
  Select,
  SegmentedControl,
  Slider,
  Switch,
  ColorSwatch,
  CheckIcon,
  Paper,
  Badge,
  ActionIcon,
  Tooltip,
  TextInput,
  Divider,
  Card,
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconSettings,
  IconPalette,
  IconTemplate,
  IconFolder,
  IconFolderOpen,
  IconCheck,
  IconLayoutKanban,
  IconPlus,
  IconArrowUp,
  IconArrowDown,
  IconEdit,
  IconTrash,
  IconRotate,
  IconEye,
  IconEyeOff,
  IconChecklist,
  IconCalendar,
  IconSparkles,
  IconInfoCircle,
  IconBook2,
  IconBrandGithub,
  IconExternalLink,
  IconTag,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAppStore } from '../../store/useAppStore';
import { ColumnBehavior, DEFAULT_KANBAN_COLUMNS, KanbanColumnConfig, WeekStartDay } from '../../types';
import { AppInfo } from '../../types/electron';
import {
  AVAILABLE_COLUMN_COLORS,
  AVAILABLE_COLUMN_ICONS,
  getColumnIcon,
  getColumnTitle,
} from '../kanban/columnUtils';
import { RoutinesManagerView } from './ManageRoutinesModal';
import { TagsManager } from '../settings/TagsManager';
import { AreasProjectsManager } from '../settings/AreasProjectsManager';
import { DATE_FORMAT_PRESETS, formatTemplateDate } from '../../utils/dateTemplate';

const THEME_COLORS = [
  'claude',
  'indigo',
  'teal',
  'blue',
  'violet',
  'cyan',
  'green',
  'orange',
  'grape',
  'pink',
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const SettingsModal: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const {
    settings,
    updateSettings,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsActiveTab,
    setSettingsActiveTab,
    openOnboarding,
    loadSettings,
    refreshNotesList,
    refreshTasksList,
    loadNoteForDate,
    selectedDate,
  } = useAppStore();

  // Column creation / editing state
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumnConfig | null>(null);

  // Form states for column modal
  const [colName, setColName] = useState('');
  const [colId, setColId] = useState('');
  const [colIdEdited, setColIdEdited] = useState(false);
  const [colColor, setColColor] = useState('blue');
  const [colIcon, setColIcon] = useState('circle-dot');
  const [colBehavior, setColBehavior] = useState<ColumnBehavior>('todo');
  const [colVisible, setColVisible] = useState(true);

  // App Info state for About tab
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    if (window.electronAPI?.getAppInfo) {
      window.electronAPI.getAppInfo().then((info) => {
        setAppInfo(info);
      }).catch((err) => {
        console.error('Failed to get app info:', err);
      });
    }
  }, []);

  if (!settings) return null;

  const currentColumns: KanbanColumnConfig[] =
    settings.kanbanColumns && settings.kanbanColumns.length > 0
      ? settings.kanbanColumns
      : DEFAULT_KANBAN_COLUMNS;

  const handleChangeVault = async () => {
    if (!window.electronAPI) {
      notifications.show({
        title: t('settings.vaultLocation'),
        message: 'Changing folder requires running in the Electron desktop window.',
        color: 'blue',
      });
      return;
    }
    const selected = await window.electronAPI.selectVaultDirectory();
    if (selected) {
      await loadSettings();
      await refreshNotesList();
      await refreshTasksList();
      await loadNoteForDate(selectedDate);
      notifications.show({
        title: t('settings.vaultLocation'),
        message: selected,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    }
  };

  const handleOpenInFinder = async () => {
    if (window.electronAPI && settings) {
      await window.electronAPI.openInFileManager(settings.vaultPath);
    } else {
      notifications.show({
        title: t('settings.openInFinder'),
        message: 'Native File Manager is available in the Electron desktop application window.',
        color: 'blue',
      });
    }
  };

  const handleLanguageChange = (lang: string | null) => {
    if (lang === 'en' || lang === 'es') {
      updateSettings({ language: lang });
    }
  };

  const handleColorSchemeChange = (mode: 'light' | 'dark' | 'auto') => {
    updateSettings({ colorScheme: mode });
    setColorScheme(mode);
  };

  const handleThemeColorChange = (color: string) => {
    updateSettings({ themeColor: color });
  };

  const handleWeekStartChange = (val: string | null) => {
    if (val !== null) {
      updateSettings({ weekStartDay: parseInt(val, 10) as WeekStartDay });
    }
  };

  const handleTemplateChange = (templateId: string | null) => {
    if (templateId) {
      updateSettings({ defaultTemplateId: templateId });
    }
  };

  // Kanban Column Management Handlers
  const handleToggleColumnVisibility = async (colIdToToggle: string) => {
    const visibleCount = currentColumns.filter((c) => c.visible).length;
    const targetCol = currentColumns.find((c) => c.id === colIdToToggle);

    if (targetCol && targetCol.visible && visibleCount <= 1) {
      notifications.show({
        title: t('settings.kanbanColumns'),
        message: t('settings.visibleColumnsNotice'),
        color: 'orange',
      });
      return;
    }

    const updated = currentColumns.map((col) => {
      if (col.id === colIdToToggle) {
        return { ...col, visible: !col.visible };
      }
      return col;
    });

    await updateSettings({ kanbanColumns: updated });
  };

  const handleMoveColumn = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentColumns.length) return;

    const newCols = [...currentColumns];
    const [moved] = newCols.splice(index, 1);
    newCols.splice(targetIndex, 0, moved);

    await updateSettings({ kanbanColumns: newCols });
  };

  const handleOpenAddColumn = () => {
    setEditingColumn(null);
    setColName('');
    setColId('');
    setColIdEdited(false);
    setColColor('indigo');
    setColIcon('circle-dot');
    setColBehavior('todo');
    setColVisible(true);
    setIsAddColumnModalOpen(true);
  };

  const handleOpenEditColumn = (col: KanbanColumnConfig) => {
    setEditingColumn(col);
    setColName(getColumnTitle(col, t));
    setColId(col.id);
    setColIdEdited(true);
    setColColor(col.color || 'blue');
    setColIcon(col.iconName || 'circle-dot');
    setColBehavior(col.behavior || 'todo');
    setColVisible(col.visible !== false);
    setIsAddColumnModalOpen(true);
  };

  const handleSaveColumnModal = async () => {
    if (!colName.trim()) return;

    const finalId = colId.trim() || slugify(colName) || `col_${Date.now()}`;

    if (editingColumn) {
      // Editing existing column
      const updated = currentColumns.map((c) => {
        if (c.id === editingColumn.id) {
          return {
            ...c,
            title: colName.trim(),
            titleKey: undefined, // custom or renamed title overrides i18n
            color: colColor,
            iconName: colIcon,
            behavior: colBehavior,
            visible: colVisible,
          };
        }
        return c;
      });

      await updateSettings({ kanbanColumns: updated });
      notifications.show({
        title: t('settings.columnUpdated'),
        message: colName.trim(),
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } else {
      // Adding new column
      // Check for duplicate ID
      let uniqueId = finalId;
      let counter = 1;
      while (currentColumns.some((c) => c.id === uniqueId)) {
        uniqueId = `${finalId}_${counter}`;
        counter++;
      }

      const newColumn: KanbanColumnConfig = {
        id: uniqueId,
        title: colName.trim(),
        color: colColor,
        iconName: colIcon,
        behavior: colBehavior,
        visible: colVisible,
        isCustom: true,
      };

      const updated = [...currentColumns, newColumn];
      await updateSettings({ kanbanColumns: updated });

      notifications.show({
        title: t('settings.columnCreated'),
        message: colName.trim(),
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    }

    setIsAddColumnModalOpen(false);
  };

  const handleDeleteColumn = async (columnIdToDelete: string) => {
    const updated = currentColumns.filter((c) => c.id !== columnIdToDelete);
    await updateSettings({ kanbanColumns: updated });

    notifications.show({
      title: t('settings.columnDeleted'),
      message: columnIdToDelete,
      color: 'red',
      icon: <IconTrash size={16} />,
    });
  };

  const handleResetColumns = async () => {
    await updateSettings({ kanbanColumns: DEFAULT_KANBAN_COLUMNS });
    notifications.show({
      title: t('settings.columnsReset'),
      message: t('settings.savedSuccess'),
      color: 'teal',
      icon: <IconRotate size={16} />,
    });
  };

  const behaviorOptions = [
    {
      value: 'todo',
      label: t('settings.behaviorTodo'),
    },
    {
      value: 'in_progress',
      label: t('settings.behaviorInProgress'),
    },
    {
      value: 'done',
      label: t('settings.behaviorDone'),
    },
    {
      value: 'cancelled',
      label: t('settings.behaviorCancelled'),
    },
    {
      value: 'waiting',
      label: t('settings.behaviorWaiting'),
    },
    {
      value: 'backlog',
      label: t('settings.behaviorBacklog'),
    },
  ];

  const getBehaviorBadgeColor = (behavior: ColumnBehavior) => {
    switch (behavior) {
      case 'done':
        return 'teal';
      case 'cancelled':
        return 'red';
      case 'in_progress':
        return 'indigo';
      case 'waiting':
        return 'yellow';
      case 'todo':
        return 'blue';
      case 'backlog':
        return 'gray';
      default:
        return 'gray';
    }
  };

  return (
    <>
      <Modal
        opened={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={
          <Group gap="xs">
            <IconSettings size={20} />
            <Text fw={700} size="lg">
              {t('settings.title')}
            </Text>
          </Group>
        }
        size="lg"
        centered
        radius="md"
      >
        <Tabs
          value={settingsActiveTab || 'general'}
          onChange={(val) => setSettingsActiveTab(val || 'general')}
          radius="md"
        >
          <Tabs.List mb="md">
            <Tabs.Tab value="general" leftSection={<IconSettings size={16} />}>
              {t('settings.general')}
            </Tabs.Tab>
            <Tabs.Tab value="areas" leftSection={<IconFolder size={16} />}>
              {t('settings.tabAreasProjects', 'Areas & Projects')}
            </Tabs.Tab>
            <Tabs.Tab value="kanban" leftSection={<IconLayoutKanban size={16} />}>
              {t('settings.kanbanColumns')}
            </Tabs.Tab>
            <Tabs.Tab value="tags" leftSection={<IconTag size={16} />}>
              {t('settings.tabTags')}
            </Tabs.Tab>
            <Tabs.Tab value="routines" leftSection={<IconChecklist size={16} />}>
              {t('settings.tabRoutines')}
            </Tabs.Tab>
            <Tabs.Tab value="appearance" leftSection={<IconPalette size={16} />}>
              {t('settings.appearance')}
            </Tabs.Tab>
            <Tabs.Tab value="templates" leftSection={<IconTemplate size={16} />}>
              {t('settings.templates')}
            </Tabs.Tab>
            <Tabs.Tab value="about" leftSection={<IconInfoCircle size={16} />}>
              {t('settings.about')}
            </Tabs.Tab>
          </Tabs.List>

          {/* General Tab */}
          <Tabs.Panel value="general">
            <Stack gap="lg">
              {/* Vault Folder */}
              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    {t('settings.vaultLocation')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('settings.vaultDescription')}
                  </Text>
                  <Text
                    size="xs"
                    p="xs"
                    style={{
                      backgroundColor: 'var(--mantine-color-default-hover)',
                      borderRadius: 6,
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {settings.vaultPath}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('settings.vaultSyncHint')}
                  </Text>
                  <Group gap="xs" mt="xs">
                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<IconFolder size={14} />}
                      onClick={handleChangeVault}
                    >
                      {t('settings.changeVault')}
                    </Button>
                    <Button
                      variant="default"
                      size="xs"
                      leftSection={<IconFolderOpen size={14} />}
                      onClick={handleOpenInFinder}
                    >
                      {t('settings.openInFinder')}
                    </Button>
                  </Group>
                </Stack>
              </Paper>

              {/* Language */}
              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    {t('settings.language')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('settings.languageDescription')}
                  </Text>
                  <Select
                    value={settings.language}
                    onChange={handleLanguageChange}
                    data={[
                      { value: 'en', label: 'English' },
                      { value: 'es', label: 'Español' },
                    ]}
                    allowDeselect={false}
                    size="sm"
                  />
                </Stack>
              </Paper>

              {/* Week Start Day */}
              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    {t('settings.weekStart')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('settings.weekStartDescription')}
                  </Text>
                  <Select
                    value={String(settings.weekStartDay)}
                    onChange={handleWeekStartChange}
                    data={[
                      { value: '1', label: t('settings.monday') },
                      { value: '2', label: t('settings.tuesday') },
                      { value: '3', label: t('settings.wednesday') },
                      { value: '4', label: t('settings.thursday') },
                      { value: '5', label: t('settings.friday') },
                      { value: '6', label: t('settings.saturday') },
                      { value: '0', label: t('settings.sunday') },
                    ]}
                    allowDeselect={false}
                    size="sm"
                  />
                </Stack>
              </Paper>

              {/* Auto Save */}
              <Paper withBorder p="md" radius="md">
                <Group justify="space-between">
                  <div>
                    <Text fw={600} size="sm">
                      {t('settings.autoSave')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('settings.autoSaveDescription')}
                    </Text>
                  </div>
                  <Switch
                    checked={settings.autoSave}
                    onChange={(e) => updateSettings({ autoSave: e.currentTarget.checked })}
                  />
                </Group>
              </Paper>

              {/* Re-run Setup Wizard */}
              <Paper withBorder p="md" radius="md">
                <Group justify="space-between" align="center">
                  <div style={{ flex: 1, paddingRight: 16 }}>
                    <Text fw={600} size="sm">
                      {t('settings.rerunWizard')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('settings.rerunWizardDesc')}
                    </Text>
                  </div>
                  <Button
                    variant="light"
                    color="primary"
                    size="xs"
                    leftSection={<IconSparkles size={14} />}
                    onClick={() => {
                      setIsSettingsOpen(false);
                      openOnboarding();
                    }}
                  >
                    {t('settings.rerunWizard')}
                  </Button>
                </Group>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* Kanban Columns Tab */}
          <Tabs.Panel value="kanban">
            <Stack gap="md">
              {/* Hide old completed / closed tasks setting */}
              <Paper withBorder p="md" radius="md">
                <Group justify="space-between" align="center">
                  <div style={{ flex: 1, paddingRight: 16 }}>
                    <Text fw={600} size="sm">
                      {t('settings.hideCompletedOlderThan30Days')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('settings.hideCompletedOlderThan30DaysDescription')}
                    </Text>
                  </div>
                  <Switch
                    checked={settings.hideCompletedOlderThan30Days ?? false}
                    onChange={(e) =>
                      updateSettings({ hideCompletedOlderThan30Days: e.currentTarget.checked })
                    }
                  />
                </Group>
              </Paper>

              <Paper withBorder p="md" radius="md">
                <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                  <div>
                    <Text fw={600} size="sm">
                      {t('settings.kanbanColumns')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('settings.kanbanColumnsDescription')}
                    </Text>
                  </div>

                  <Group gap="xs">
                    <Tooltip label={t('settings.resetColumns')} withArrow>
                      <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        leftSection={<IconRotate size={14} />}
                        onClick={handleResetColumns}
                      >
                        {t('settings.resetColumns')}
                      </Button>
                    </Tooltip>
                    <Button
                      variant="filled"
                      color="primary"
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                      onClick={handleOpenAddColumn}
                      radius="md"
                    >
                      {t('settings.addColumn')}
                    </Button>
                  </Group>
                </Group>
              </Paper>

              {/* Columns List */}
              <Stack gap="xs">
                {currentColumns.map((col, index) => {
                  const title = getColumnTitle(col, t);
                  const isVisible = col.visible !== false;
                  const behaviorBadgeColor = getBehaviorBadgeColor(col.behavior);

                  return (
                    <Card
                      key={col.id}
                      withBorder
                      p="sm"
                      radius="md"
                      style={{
                        opacity: isVisible ? 1 : 0.65,
                        transition: 'all 0.15s ease',
                        backgroundColor: isDark
                          ? isVisible
                            ? 'var(--mantine-color-dark-6)'
                            : 'var(--mantine-color-dark-8)'
                          : isVisible
                            ? '#ffffff'
                            : 'var(--mantine-color-gray-1)',
                      }}
                    >
                      <Group justify="space-between" align="center" wrap="nowrap">
                        {/* Left: Reorder, Icon, Title & Details */}
                        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                          {/* Reorder Up/Down */}
                          <Stack gap={2}>
                            <ActionIcon
                              variant="subtle"
                              size="xs"
                              color="gray"
                              disabled={index === 0}
                              onClick={() => handleMoveColumn(index, -1)}
                            >
                              <IconArrowUp size={13} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              size="xs"
                              color="gray"
                              disabled={index === currentColumns.length - 1}
                              onClick={() => handleMoveColumn(index, 1)}
                            >
                              <IconArrowDown size={13} />
                            </ActionIcon>
                          </Stack>

                          {/* Column Color & Icon Tag */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: `var(--mantine-color-${col.color}-light)`,
                              color: `var(--mantine-color-${col.color}-filled)`,
                              flexShrink: 0,
                            }}
                          >
                            {getColumnIcon(col.iconName, 17)}
                          </div>

                          {/* Title and ID / Behavior */}
                          <Stack gap={2} style={{ minWidth: 0 }}>
                            <Group gap={6} wrap="nowrap">
                              <Text fw={600} size="sm" truncate>
                                {title}
                              </Text>
                              {col.isCustom && (
                                <Badge size="xs" variant="outline" color="gray">
                                  custom
                                </Badge>
                              )}
                            </Group>
                            <Group gap={6} wrap="wrap">
                              <Badge size="xs" color={behaviorBadgeColor} variant="light">
                                {col.behavior.replace('_', ' ')}
                              </Badge>
                              <Text size="xs" c="dimmed">
                                id: {col.id}
                              </Text>
                            </Group>
                          </Stack>
                        </Group>

                        {/* Right: Visibility toggle & Actions */}
                        <Group gap="xs" wrap="nowrap">
                          <Tooltip
                            label={isVisible ? t('settings.hideColumn') : t('settings.showColumn')}
                            withArrow
                          >
                            <Switch
                              checked={isVisible}
                              onChange={() => handleToggleColumnVisibility(col.id)}
                              size="sm"
                              color="teal"
                              onLabel={<IconEye size={12} />}
                              offLabel={<IconEyeOff size={12} />}
                            />
                          </Tooltip>

                          <Tooltip label={t('settings.editColumnTitle')} withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              onClick={() => handleOpenEditColumn(col)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>

                          {col.isCustom && (
                            <Tooltip label={t('settings.deleteColumn')} withArrow>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="sm"
                                onClick={() => handleDeleteColumn(col.id)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Group>
                    </Card>
                  );
                })}
              </Stack>
            </Stack>
          </Tabs.Panel>

          {/* Appearance Tab */}
          <Tabs.Panel value="appearance">
            <Stack gap="lg">
              {/* Color Mode */}
              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    {t('settings.colorScheme')}
                  </Text>
                  <SegmentedControl
                    value={settings.colorScheme}
                    onChange={(val) => handleColorSchemeChange(val as any)}
                    data={[
                      { value: 'light', label: t('settings.light') },
                      { value: 'dark', label: t('settings.dark') },
                      { value: 'auto', label: t('settings.auto') },
                    ]}
                    size="sm"
                  />
                </Stack>
              </Paper>

              {/* Theme Accent Color */}
              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    {t('settings.themeColor')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('settings.themeDescription')}
                  </Text>
                  <Group gap="sm" mt="xs">
                    {THEME_COLORS.map((color) => {
                      const isSelected = (settings.themeColor || 'claude') === color;
                      return (
                        <ColorSwatch
                          key={color}
                          color={`var(--mantine-color-${color}-6)`}
                          size={32}
                          radius="md"
                          style={{ color: '#fff', cursor: 'pointer' }}
                          onClick={() => handleThemeColorChange(color)}
                        >
                          {isSelected && <CheckIcon width={14} />}
                        </ColorSwatch>
                      );
                    })}
                  </Group>
                </Stack>
              </Paper>

              {/* Font Size */}
              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={600} size="sm">
                      {t('settings.fontSize')}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {settings.editorFontSize}px
                    </Text>
                  </Group>
                  <Slider
                    value={settings.editorFontSize}
                    onChange={(val) => updateSettings({ editorFontSize: val })}
                    min={12}
                    max={24}
                    step={1}
                    marks={[
                      { value: 12, label: '12' },
                      { value: 15, label: '15' },
                      { value: 18, label: '18' },
                      { value: 24, label: '24' },
                    ]}
                    mb="sm"
                  />
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* Templates Tab */}
          <Tabs.Panel value="templates">
            <Stack gap="md">
              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    {t('settings.defaultTemplate')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('settings.defaultTemplateDescription')}
                  </Text>
                  <Select
                    value={settings.defaultTemplateId}
                    onChange={handleTemplateChange}
                    data={settings.templates.map((tpl) => ({
                      value: tpl.id,
                      label: tpl.name,
                    }))}
                    allowDeselect={false}
                    size="sm"
                  />
                </Stack>
              </Paper>

              {/* Template Date Format Setting */}
              <Paper withBorder p="md" radius="md">
                <Stack gap="sm">
                  <div>
                    <Text fw={600} size="sm">
                      {t('settings.templateDateFormat')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('settings.templateDateFormatDesc')}
                    </Text>
                  </div>

                  <Select
                    label={t('settings.dateFormatPreset')}
                    value={
                      DATE_FORMAT_PRESETS.some((p) => p.value !== 'custom' && p.value === (settings.dateFormat || 'YYYY-MM-DD'))
                        ? (settings.dateFormat || 'YYYY-MM-DD')
                        : 'custom'
                    }
                    onChange={(val) => {
                      if (!val) return;
                      if (val !== 'custom') {
                        updateSettings({ dateFormat: val });
                      }
                    }}
                    data={DATE_FORMAT_PRESETS.map((preset) => ({
                      value: preset.value,
                      label: `${t(preset.labelKey)}${preset.example ? ` (${preset.example})` : ''}`,
                    }))}
                    allowDeselect={false}
                    size="sm"
                  />

                  {/* Custom Format Input when custom is selected */}
                  {(!DATE_FORMAT_PRESETS.some((p) => p.value !== 'custom' && p.value === (settings.dateFormat || 'YYYY-MM-DD')) ||
                    settings.dateFormat === 'custom') && (
                      <TextInput
                        label={t('settings.customDateFormat')}
                        placeholder={t('settings.customFormatPlaceholder')}
                        value={settings.dateFormat === 'custom' ? '' : settings.dateFormat}
                        onChange={(e) => updateSettings({ dateFormat: e.currentTarget.value })}
                        size="sm"
                        radius="md"
                      />
                    )}

                  {/* Live Rendered Preview Card */}
                  <Paper
                    p="xs"
                    radius="md"
                    style={{
                      backgroundColor: 'var(--mantine-color-default-hover)',
                      border: '1px dashed var(--mantine-color-default-border)',
                    }}
                  >
                    <Group justify="space-between" align="center" wrap="wrap">
                      <Group gap={6}>
                        <IconCalendar size={15} color="var(--mantine-primary-color-filled)" />
                        <Text size="xs" fw={600}>
                          {t('settings.formatPreview')}:
                        </Text>
                      </Group>
                      <Badge size="md" variant="filled" color="primary" radius="sm">
                        {formatTemplateDate(
                          dayjs().format('YYYY-MM-DD'),
                          settings.dateFormat || 'YYYY-MM-DD',
                          i18n.language
                        )}
                      </Badge>
                    </Group>
                  </Paper>

                  <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                    {t('settings.formatTokensHelp')}
                  </Text>
                </Stack>
              </Paper>

              {/* Template previews */}
              {settings.templates.map((tpl) => (
                <Paper key={tpl.id} withBorder p="sm" radius="md">
                  <Group justify="space-between" mb={4}>
                    <Text fw={600} size="sm">
                      {tpl.name}
                    </Text>
                    {tpl.id === settings.defaultTemplateId && (
                      <Text size="xs" c="primary" fw={700}>
                        ✓ Default
                      </Text>
                    )}
                  </Group>
                  {tpl.description && (
                    <Text size="xs" c="dimmed" mb={8}>
                      {tpl.description}
                    </Text>
                  )}
                  <pre
                    style={{
                      backgroundColor: 'var(--mantine-color-default-hover)',
                      padding: 8,
                      borderRadius: 6,
                      fontSize: 12,
                      maxHeight: 120,
                      overflowY: 'auto',
                      margin: 0,
                    }}
                  >
                    {tpl.content}
                  </pre>
                </Paper>
              ))}
            </Stack>
          </Tabs.Panel>

          {/* Areas & Projects Tab */}
          <Tabs.Panel value="areas">
            <AreasProjectsManager />
          </Tabs.Panel>

          {/* Tags & Projects Tab */}
          <Tabs.Panel value="tags">
            <TagsManager />
          </Tabs.Panel>

          {/* Routines Tab */}
          <Tabs.Panel value="routines">
            <RoutinesManagerView />
          </Tabs.Panel>

          {/* About Tab */}
          <Tabs.Panel value="about">
            <Stack gap="lg">
              {/* Header App Info Card */}
              <Paper withBorder p="lg" radius="md" style={{ textAlign: 'center' }}>
                <Stack align="center" gap="xs">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      backgroundColor: 'var(--mantine-primary-color-filled)',
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    <IconBook2 size={32} stroke={2} />
                  </div>
                  <Group gap="xs" justify="center" mt="xs">
                    <Text fw={800} size="xl" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                      Daily Worklog
                    </Text>
                    <Badge size="lg" variant="gradient" gradient={{ from: 'primary', to: 'indigo', deg: 45 }}>
                      v{appInfo?.version || '1.5.0'}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed" style={{ maxWidth: 460 }}>
                    {t('settings.appTagline')}
                  </Text>
                </Stack>
              </Paper>

              {/* Version & Environment Details */}
              <Paper withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Text fw={600} size="sm">
                    {t('settings.systemInfo')}
                  </Text>
                  <Card withBorder p="sm" radius="sm" style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
                    <Stack gap={8}>
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">{t('settings.appVersion')}:</Text>
                        <Badge size="sm" variant="filled" color="primary">{appInfo?.version || '1.5.0'}</Badge>
                      </Group>
                      <Divider />
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">{t('settings.electronVersion')}:</Text>
                        <Text size="xs" fw={600} style={{ fontFamily: 'monospace' }}>
                          {appInfo?.electron || (window.electronAPI ? '34.x' : 'Web Renderer')}
                        </Text>
                      </Group>
                      <Divider />
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">{t('settings.chromeVersion')}:</Text>
                        <Text size="xs" fw={600} style={{ fontFamily: 'monospace' }}>
                          {appInfo?.chrome || 'Chromium'}
                        </Text>
                      </Group>
                      <Divider />
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">{t('settings.nodeVersion')}:</Text>
                        <Text size="xs" fw={600} style={{ fontFamily: 'monospace' }}>
                          {appInfo?.node || 'Node.js'}
                        </Text>
                      </Group>
                      <Divider />
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">{t('settings.osPlatform')}:</Text>
                        <Text size="xs" fw={600} style={{ fontFamily: 'monospace' }}>
                          {appInfo?.osRelease || (window.electronAPI?.platform || (typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'))}
                        </Text>
                      </Group>
                    </Stack>
                  </Card>

                  <Group mt="xs" gap="xs">
                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<IconInfoCircle size={15} />}
                      onClick={() => {
                        if (window.electronAPI?.showAboutDialog) {
                          window.electronAPI.showAboutDialog();
                        }
                      }}
                    >
                      {t('settings.openNativeAbout')}
                    </Button>
                  </Group>
                </Stack>
              </Paper>

              {/* Links & License */}
              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    {t('settings.links')}
                  </Text>
                  <Group gap="xs">
                    <Button
                      variant="default"
                      size="xs"
                      leftSection={<IconBrandGithub size={15} />}
                      rightSection={<IconExternalLink size={13} />}
                      onClick={() => {
                        if (window.electronAPI?.openExternalUrl) {
                          window.electronAPI.openExternalUrl('https://github.com/renefs/daily-worklogs');
                        } else {
                          window.open('https://github.com/renefs/daily-worklogs', '_blank');
                        }
                      }}
                    >
                      {t('settings.sourceCode')}
                    </Button>
                    <Badge size="md" variant="outline" color="gray">
                      {t('settings.license')}
                    </Badge>
                  </Group>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Group justify="flex-end" mt="xl">
          <Button onClick={() => setIsSettingsOpen(false)} radius="md">
            {t('common.close')}
          </Button>
        </Group>
      </Modal>

      {/* Add / Edit Column Modal */}
      <Modal
        opened={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        title={
          <Group gap="xs">
            <IconLayoutKanban size={18} color="var(--mantine-primary-color-filled)" />
            <Text fw={700} size="md">
              {editingColumn ? t('settings.editColumnTitle') : t('settings.newColumnTitle')}
            </Text>
          </Group>
        }
        size="md"
        radius="md"
        centered
      >
        <Stack gap="md">
          {/* Column Name */}
          <TextInput
            label={t('settings.columnName')}
            placeholder={t('settings.columnNamePlaceholder')}
            value={colName}
            onChange={(e) => {
              const val = e.currentTarget.value;
              setColName(val);
              if (!colIdEdited && !editingColumn) {
                setColId(slugify(val));
              }
            }}
            required
            autoFocus
            radius="md"
          />

          {/* Status ID */}
          {!editingColumn && (
            <TextInput
              label={t('settings.columnId')}
              placeholder={t('settings.columnIdPlaceholder')}
              value={colId}
              onChange={(e) => {
                setColIdEdited(true);
                setColId(e.currentTarget.value);
              }}
              description="Internal status code saved to markdown files (e.g. cancelled, review)"
              radius="md"
            />
          )}

          {/* Lifecycle Behavior */}
          <div>
            <Select
              label={t('settings.columnBehavior')}
              description={t('settings.columnBehaviorDescription')}
              value={colBehavior}
              onChange={(val) => val && setColBehavior(val as ColumnBehavior)}
              data={behaviorOptions}
              allowDeselect={false}
              radius="md"
            />
          </div>

          {/* Icon Selector */}
          <div>
            <Select
              label={t('settings.columnIcon')}
              value={colIcon}
              onChange={(val) => val && setColIcon(val)}
              data={AVAILABLE_COLUMN_ICONS.map((i) => ({ value: i.value, label: i.label }))}
              allowDeselect={false}
              radius="md"
              renderOption={({ option }) => {
                const iconObj = AVAILABLE_COLUMN_ICONS.find((i) => i.value === option.value);
                return (
                  <Group gap="xs">
                    {iconObj?.icon}
                    <Text size="sm">{option.label}</Text>
                  </Group>
                );
              }}
              leftSection={getColumnIcon(colIcon, 16)}
            />
          </div>

          {/* Column Color */}
          <div>
            <Text size="sm" fw={500} mb={6}>
              {t('settings.columnColor')}
            </Text>
            <Group gap="xs" wrap="wrap">
              {AVAILABLE_COLUMN_COLORS.map((c) => (
                <ColorSwatch
                  key={c}
                  color={`var(--mantine-color-${c}-6)`}
                  size={28}
                  radius="md"
                  style={{ color: '#fff', cursor: 'pointer' }}
                  onClick={() => setColColor(c)}
                >
                  {colColor === c && <CheckIcon width={12} />}
                </ColorSwatch>
              ))}
            </Group>
          </div>

          {/* Visibility switch */}
          <Divider my="xs" />
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>
                {t('settings.showColumn')}
              </Text>
              <Text size="xs" c="dimmed">
                Show column in the Kanban board
              </Text>
            </div>
            <Switch checked={colVisible} onChange={(e) => setColVisible(e.currentTarget.checked)} />
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setIsAddColumnModalOpen(false)} radius="md">
              {t('common.cancel')}
            </Button>
            <Button
              color="primary"
              onClick={handleSaveColumnModal}
              disabled={!colName.trim()}
              radius="md"
            >
              {t('common.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
