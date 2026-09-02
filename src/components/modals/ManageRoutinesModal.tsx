import React, { useState } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Textarea,
  SegmentedControl,
  Checkbox,
  Switch,
  Paper,
  ActionIcon,
  Tooltip,
  Badge,
  Card,
  Divider,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
  IconExternalLink,
  IconCheck,
  IconCalendarEvent,
  IconListCheck,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../store/useAppStore';
import { DailyRoutine, RoutineSchedule } from '../../types';

interface RoutineFormData {
  id?: string;
  title: string;
  url: string;
  description: string;
  scheduleType: 'everyday' | 'weekdays' | 'custom';
  customDays: string[]; // ['0', '1', ...]
  enabled: boolean;
}

const DEFAULT_FORM: RoutineFormData = {
  title: '',
  url: '',
  description: '',
  scheduleType: 'everyday',
  customDays: ['1', '2', '3', '4', '5'],
  enabled: true,
};

export const RoutinesManagerView: React.FC = () => {
  const { t } = useTranslation();
  const { settings, saveRoutinesList, openExternalUrl } = useAppStoreSelector((state) => ({
    settings: state.settings,
    saveRoutinesList: state.saveRoutinesList,
    openExternalUrl: state.openExternalUrl,
  }));

  const routines: DailyRoutine[] = settings?.routines || [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<RoutineFormData>(DEFAULT_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const startCreate = () => {
    setFormData(DEFAULT_FORM);
    setEditingId(null);
    setIsCreating(true);
  };

  const startEdit = (routine: DailyRoutine) => {
    let scheduleType: 'everyday' | 'weekdays' | 'custom' = 'everyday';
    let customDays: string[] = ['1', '2', '3', '4', '5'];

    if (routine.schedule === 'everyday' || routine.schedule === 'weekdays') {
      scheduleType = routine.schedule;
    } else if (Array.isArray(routine.schedule)) {
      scheduleType = 'custom';
      customDays = routine.schedule.map(String);
    }

    setFormData({
      id: routine.id,
      title: routine.title,
      url: routine.url || '',
      description: routine.description || '',
      scheduleType,
      customDays,
      enabled: routine.enabled,
    });
    setEditingId(routine.id);
    setIsCreating(false);
  };

  const handleSaveForm = async () => {
    if (!formData.title.trim()) return;

    let schedule: RoutineSchedule = 'everyday';
    if (formData.scheduleType === 'weekdays') {
      schedule = 'weekdays';
    } else if (formData.scheduleType === 'custom') {
      schedule = formData.customDays.map(Number).sort((a, b) => a - b);
    }

    const newRoutine: DailyRoutine = {
      id: formData.id || `routine-${Date.now()}`,
      title: formData.title.trim(),
      url: formData.url.trim() ? formData.url.trim() : undefined,
      description: formData.description.trim() ? formData.description.trim() : undefined,
      schedule,
      enabled: formData.enabled,
    };

    let updated: DailyRoutine[];
    if (editingId) {
      updated = routines.map((r) => (r.id === editingId ? newRoutine : r));
    } else {
      updated = [...routines, newRoutine];
    }

    await saveRoutinesList(updated);
    setIsCreating(false);
    setEditingId(null);
    notifications.show({
      title: t('common.save'),
      message: t('routines.saved'),
      color: 'teal',
      icon: <IconCheck size={16} />,
    });
  };

  const handleToggleEnable = async (routineId: string) => {
    const updated = routines.map((r) =>
      r.id === routineId ? { ...r, enabled: !r.enabled } : r
    );
    await saveRoutinesList(updated);
  };

  const handleDelete = async (routineId: string) => {
    const updated = routines.filter((r) => r.id !== routineId);
    await saveRoutinesList(updated);
    setDeleteConfirmId(null);
    notifications.show({
      title: t('common.delete'),
      message: t('routines.deleted'),
      color: 'red',
      icon: <IconTrash size={16} />,
    });
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= routines.length) return;
    const copy = [...routines];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    await saveRoutinesList(copy);
  };

  const renderScheduleBadge = (schedule: RoutineSchedule) => {
    if (schedule === 'everyday') {
      return (
        <Badge size="xs" variant="light" color="blue">
          {t('routines.scheduleEveryday')}
        </Badge>
      );
    }
    if (schedule === 'weekdays') {
      return (
        <Badge size="xs" variant="light" color="cyan">
          {t('routines.scheduleWeekdays')}
        </Badge>
      );
    }
    const dayLabels = [
      t('routines.days.sun'),
      t('routines.days.mon'),
      t('routines.days.tue'),
      t('routines.days.wed'),
      t('routines.days.thu'),
      t('routines.days.fri'),
      t('routines.days.sat'),
    ];
    const text = schedule.map((d) => dayLabels[d]).join(', ');
    return (
      <Badge size="xs" variant="light" color="grape">
        {text || t('routines.scheduleCustom')}
      </Badge>
    );
  };

  return (
    <Stack gap="md">
      {/* Header & Add Button */}
      <Group justify="space-between" align="center">
        <div>
          <Text fw={600} size="sm">
            {t('routines.title')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('routines.subtitle')}
          </Text>
        </div>
        {!isCreating && !editingId && (
          <Button
            leftSection={<IconPlus size={16} />}
            size="xs"
            variant="light"
            onClick={startCreate}
          >
            {t('routines.addRoutine')}
          </Button>
        )}
      </Group>

      {/* Inline Form for Create/Edit */}
      {(isCreating || editingId) && (
        <Card withBorder padding="md" radius="md" style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Text fw={600} size="sm">
                {editingId ? t('routines.editRoutine') : t('routines.newRoutine')}
              </Text>
              <Switch
                label={t('routines.enabled')}
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.currentTarget.checked })}
                size="xs"
              />
            </Group>

            <TextInput
              label={t('routines.routineTitle')}
              placeholder={t('routines.routineTitlePlaceholder')}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              data-autofocus
            />

            <TextInput
              label={t('routines.url')}
              placeholder={t('routines.urlPlaceholder')}
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              leftSection={<IconExternalLink size={14} />}
              rightSection={
                formData.url ? (
                  <Tooltip label={t('routines.openUrl')}>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => openExternalUrl(formData.url)}
                    >
                      <IconExternalLink size={14} />
                    </ActionIcon>
                  </Tooltip>
                ) : null
              }
            />

            <Textarea
              label={t('routines.description')}
              placeholder={t('routines.descriptionPlaceholder')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              autosize
              minRows={2}
              maxRows={4}
            />

            <div>
              <Text size="xs" fw={500} mb={4}>
                {t('routines.schedule')}
              </Text>
              <SegmentedControl
                value={formData.scheduleType}
                onChange={(val: any) => setFormData({ ...formData, scheduleType: val })}
                fullWidth
                size="xs"
                data={[
                  { label: t('routines.scheduleEveryday'), value: 'everyday' },
                  { label: t('routines.scheduleWeekdays'), value: 'weekdays' },
                  { label: t('routines.scheduleCustom'), value: 'custom' },
                ]}
              />
            </div>

            {formData.scheduleType === 'custom' && (
              <Checkbox.Group
                value={formData.customDays}
                onChange={(val) => setFormData({ ...formData, customDays: val })}
              >
                <Group gap="xs" mt={4}>
                  {[
                    { value: '1', label: t('routines.days.mon') },
                    { value: '2', label: t('routines.days.tue') },
                    { value: '3', label: t('routines.days.wed') },
                    { value: '4', label: t('routines.days.thu') },
                    { value: '5', label: t('routines.days.fri') },
                    { value: '6', label: t('routines.days.sat') },
                    { value: '0', label: t('routines.days.sun') },
                  ].map((day) => (
                    <Checkbox key={day.value} value={day.value} label={day.label} size="xs" />
                  ))}
                </Group>
              </Checkbox.Group>
            )}

            <Divider my="xs" />

            <Group justify="flex-end" gap="xs">
              <Button
                variant="default"
                size="xs"
                onClick={() => {
                  setIsCreating(false);
                  setEditingId(null);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="xs"
                onClick={handleSaveForm}
                disabled={!formData.title.trim()}
              >
                {t('common.save')}
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Routines List */}
      {routines.length === 0 ? (
        <Paper p="lg" withBorder radius="md" style={{ textAlign: 'center' }}>
          <IconListCheck size={32} style={{ opacity: 0.35, marginBottom: 8 }} />
          <Text size="sm" c="dimmed">
            {t('routines.noRoutinesConfigured')}
          </Text>
          <Button
            mt="sm"
            size="xs"
            variant="light"
            leftSection={<IconPlus size={14} />}
            onClick={startCreate}
          >
            {t('routines.addRoutine')}
          </Button>
        </Paper>
      ) : (
        <Stack gap="xs">
          {routines.map((routine, idx) => (
            <Paper
              key={routine.id}
              p="sm"
              withBorder
              radius="md"
              style={{
                opacity: routine.enabled ? 1 : 0.6,
                transition: 'all 0.15s ease',
              }}
            >
              <Group justify="space-between" align="center" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <Switch
                    checked={routine.enabled}
                    onChange={() => handleToggleEnable(routine.id)}
                    size="xs"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs" align="center" wrap="nowrap">
                      <Text
                        size="sm"
                        fw={500}
                        truncate
                        style={{
                          textDecoration: routine.enabled ? 'none' : 'line-through',
                        }}
                      >
                        {routine.title}
                      </Text>
                      {renderScheduleBadge(routine.schedule)}
                      {routine.url && (
                        <ActionIcon
                          variant="subtle"
                          size="xs"
                          color="blue"
                          onClick={() => openExternalUrl(routine.url!)}
                          title={routine.url}
                        >
                          <IconExternalLink size={12} />
                        </ActionIcon>
                      )}
                    </Group>
                    {routine.description && (
                      <Text size="xs" c="dimmed" truncate>
                        {routine.description}
                      </Text>
                    )}
                  </div>
                </Group>

                <Group gap={4} wrap="nowrap">
                  <Tooltip label={t('settings.moveUp')}>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                    >
                      <IconArrowUp size={14} />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label={t('settings.moveDown')}>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      disabled={idx === routines.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                    >
                      <IconArrowDown size={14} />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label={t('routines.editRoutine')}>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => startEdit(routine)}
                    >
                      <IconEdit size={14} />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label={t('routines.deleteRoutine')}>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      color="red"
                      onClick={() => setDeleteConfirmId(routine.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal
          opened={Boolean(deleteConfirmId)}
          onClose={() => setDeleteConfirmId(null)}
          title={t('routines.deleteRoutine')}
          size="sm"
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              {t('routines.deleteConfirm', {
                title: routines.find((r) => r.id === deleteConfirmId)?.title || '',
              })}
            </Text>
            <Group justify="flex-end" gap="xs">
              <Button variant="default" size="xs" onClick={() => setDeleteConfirmId(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                color="red"
                size="xs"
                onClick={() => handleDelete(deleteConfirmId)}
              >
                {t('common.delete')}
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
};

export const ManageRoutinesModal: React.FC = () => {
  const { t } = useTranslation();
  const { isManageRoutinesModalOpen, closeManageRoutinesModal } = useAppStoreSelector((state) => ({
    isManageRoutinesModalOpen: state.isManageRoutinesModalOpen,
    closeManageRoutinesModal: state.closeManageRoutinesModal,
  }));

  return (
    <Modal
      opened={isManageRoutinesModalOpen}
      onClose={closeManageRoutinesModal}
      title={
        <Group gap="xs">
          <IconCalendarEvent size={18} />
          <Text fw={600} size="md">
            {t('routines.manage')}
          </Text>
        </Group>
      }
      size="lg"
      centered
      radius="md"
    >
      <RoutinesManagerView />
    </Modal>
  );
};
