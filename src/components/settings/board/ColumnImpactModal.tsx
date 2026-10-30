import React, { useState } from 'react';
import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';

export interface ColumnMoveTarget {
  value: string;
  label: string;
}

export interface ColumnImpactModalProps {
  opened: boolean;
  title: string;
  message: string;
  /** Extra sentence shown when tasks are affected, for example how many will move. */
  taskNotice?: string;
  /** When set, the user picks the column that receives the affected tasks. */
  moveTargets?: ColumnMoveTarget[];
  moveTargetLabel?: string;
  defaultMoveTarget?: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmColor?: string;
  loading?: boolean;
  onConfirm: (moveTargetId: string | null) => void;
  onClose: () => void;
}

export const ColumnImpactModal: React.FC<ColumnImpactModalProps> = ({
  opened,
  title,
  message,
  taskNotice,
  moveTargets,
  moveTargetLabel,
  defaultMoveTarget,
  confirmLabel,
  cancelLabel,
  confirmColor = 'red',
  loading = false,
  onConfirm,
  onClose,
}) => {
  const [pickedTarget, setPickedTarget] = useState<string | null>(null);
  const selectedTarget = pickedTarget ?? defaultMoveTarget ?? moveTargets?.[0]?.value ?? null;

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={700}>{title}</Text>} size="sm" centered>
      <Stack gap="md">
        <Text size="sm">{message}</Text>
        {taskNotice && (
          <Text size="sm" fw={500}>
            {taskNotice}
          </Text>
        )}
        {moveTargets && moveTargets.length > 0 && (
          <Select
            label={moveTargetLabel}
            data={moveTargets}
            value={selectedTarget}
            onChange={setPickedTarget}
            allowDeselect={false}
            comboboxProps={{ withinPortal: true }}
          />
        )}
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button color={confirmColor} loading={loading} onClick={() => onConfirm(selectedTarget)}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
