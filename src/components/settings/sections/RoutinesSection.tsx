import React, { useState } from 'react';
import { Button, Group, Modal, Paper, Stack, Switch, Text } from '@mantine/core';
import { IconCheck, IconListCheck, IconPlus, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../../store/useAppStore';
import { DailyRoutine } from '../../../types';
import { RoutineForm } from '../routines/RoutineForm';
import { RoutineRow } from '../routines/RoutineRow';
import {
  EMPTY_ROUTINE_FORM,
  formDataToRoutine,
  RoutineFormData,
  routineToFormData,
} from '../routines/routineFormData';
import { SettingsSection } from '../SettingsSection';
import classes from '../routines/RoutinesSection.module.css';

export const RoutinesSection: React.FC = () => {
  const { t } = useTranslation();
  const { settings, saveRoutinesList, openExternalUrl, updateSettings } = useAppStoreSelector((state) => ({
    settings: state.settings,
    saveRoutinesList: state.saveRoutinesList,
    openExternalUrl: state.openExternalUrl,
    updateSettings: state.updateSettings,
  }));

  const routines: DailyRoutine[] = settings?.routines || [];
  const isFeatureEnabled = settings?.enableDailyRoutines !== false;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<RoutineFormData>(EMPTY_ROUTINE_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isFormOpen = isFeatureEnabled && (isCreating || editingId !== null);

  const closeForm = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  const startCreate = () => {
    setFormData(EMPTY_ROUTINE_FORM);
    setEditingId(null);
    setIsCreating(true);
  };

  const startEdit = (routine: DailyRoutine) => {
    setFormData(routineToFormData(routine));
    setEditingId(routine.id);
    setIsCreating(false);
  };

  const handleSaveForm = async () => {
    if (!formData.title.trim()) return;
    const saved = formDataToRoutine(formData);
    const updated = editingId
      ? routines.map((r) => (r.id === editingId ? saved : r))
      : [...routines, saved];
    await saveRoutinesList(updated);
    closeForm();
    notifications.show({
      title: t('common.save'),
      message: t('routines.saved'),
      color: 'teal',
      icon: <IconCheck size={16} />,
    });
  };

  const handleToggleEnable = async (routineId: string) => {
    await saveRoutinesList(routines.map((r) => (r.id === routineId ? { ...r, enabled: !r.enabled } : r)));
  };

  const handleDelete = async (routineId: string) => {
    await saveRoutinesList(routines.filter((r) => r.id !== routineId));
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
    [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
    await saveRoutinesList(copy);
  };

  const routineToDelete = routines.find((r) => r.id === deleteConfirmId);

  const addButton = !isFormOpen && (
    <Button
      leftSection={<IconPlus size={16} />}
      size="sm"
      variant="light"
      disabled={!isFeatureEnabled}
      onClick={startCreate}
    >
      {t('routines.addRoutine')}
    </Button>
  );

  return (
    <SettingsSection
      title={t('routines.title')}
      description={isFeatureEnabled ? t('routines.subtitle') : t('routines.disabledNotice')}
      actions={addButton}
      scope="vault"
    >
      <Stack gap="md">
        <Paper withBorder p="sm" radius="md">
          <Group justify="space-between" align="center" wrap="nowrap">
            <div>
              <Text fw={600} size="sm">
                {t('settings.enableDailyRoutines')}
              </Text>
              <Text size="xs" c="dimmed">
                {t('settings.enableDailyRoutinesDesc')}
              </Text>
            </div>
            <Switch
              checked={isFeatureEnabled}
              aria-label={t('settings.enableDailyRoutines')}
              onChange={(e) => updateSettings({ enableDailyRoutines: e.currentTarget.checked })}
            />
          </Group>
        </Paper>

        {isFormOpen && (
          <RoutineForm
            value={formData}
            isEditing={editingId !== null}
            onChange={setFormData}
            onSave={handleSaveForm}
            onCancel={closeForm}
            onOpenUrl={openExternalUrl}
          />
        )}

        {routines.length === 0 ? (
          <Paper p="lg" withBorder radius="md" className={classes.emptyState}>
            <IconListCheck size={32} className={classes.emptyIcon} />
            <Text size="sm" c="dimmed">
              {t('routines.noRoutinesConfigured')}
            </Text>
            <Button
              mt="sm"
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              disabled={!isFeatureEnabled}
              onClick={startCreate}
            >
              {t('routines.addRoutine')}
            </Button>
          </Paper>
        ) : (
          <Stack gap="xs">
            {routines.map((routine, index) => (
              <RoutineRow
                key={routine.id}
                routine={routine}
                isFirst={index === 0}
                isLast={index === routines.length - 1}
                disabled={!isFeatureEnabled}
                onToggleEnabled={() => handleToggleEnable(routine.id)}
                onMove={(direction) => handleMove(index, direction)}
                onEdit={() => startEdit(routine)}
                onDelete={() => setDeleteConfirmId(routine.id)}
                onOpenUrl={openExternalUrl}
              />
            ))}
          </Stack>
        )}

        <Modal
          opened={deleteConfirmId !== null}
          onClose={() => setDeleteConfirmId(null)}
          title={t('routines.deleteRoutine')}
          size="sm"
          centered
        >
          <Stack gap="md">
            <Text size="sm">{t('routines.deleteConfirm', { title: routineToDelete?.title || '' })}</Text>
            <Group justify="flex-end" gap="xs">
              <Button variant="default" size="xs" onClick={() => setDeleteConfirmId(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                color="red"
                size="xs"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              >
                {t('common.delete')}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </SettingsSection>
  );
};
