import React from 'react';
import { Modal, Text, Group, Button } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export interface TaskDeleteModalProps {
  opened: boolean;
  onClose: () => void;
  onDelete: () => Promise<void> | void;
  isSaving?: boolean;
  taskTitle: string;
  filename?: string;
}

export const TaskDeleteModal: React.FC<TaskDeleteModalProps> = ({
  opened,
  onClose,
  onDelete,
  isSaving = false,
  taskTitle,
  filename,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('tasks.deleteTask')}
      centered
      radius="md"
    >
      <Text size="sm" mb="lg">
        {t('tasks.deleteConfirm', {
          title: taskTitle || 'this task',
          filename: filename || '',
        })}
      </Text>
      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button color="red" onClick={() => void onDelete()} loading={isSaving}>
          {t('common.delete')}
        </Button>
      </Group>
    </Modal>
  );
};
