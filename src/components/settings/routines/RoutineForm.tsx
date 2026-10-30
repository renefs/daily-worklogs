import React from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { isRoutineScheduleType, RoutineFormData } from './routineFormData';
import classes from './RoutinesSection.module.css';

export interface RoutineFormProps {
  value: RoutineFormData;
  isEditing: boolean;
  onChange: (next: RoutineFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  onOpenUrl: (url: string) => void;
}

const DAY_ORDER: Array<{ value: string; labelKey: string }> = [
  { value: '1', labelKey: 'routines.days.mon' },
  { value: '2', labelKey: 'routines.days.tue' },
  { value: '3', labelKey: 'routines.days.wed' },
  { value: '4', labelKey: 'routines.days.thu' },
  { value: '5', labelKey: 'routines.days.fri' },
  { value: '6', labelKey: 'routines.days.sat' },
  { value: '0', labelKey: 'routines.days.sun' },
];

export const RoutineForm: React.FC<RoutineFormProps> = ({
  value,
  isEditing,
  onChange,
  onSave,
  onCancel,
  onOpenUrl,
}) => {
  const { t } = useTranslation();

  return (
    <Card withBorder padding="md" radius="md" className={classes.formCard}>
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text fw={600} size="sm">
            {isEditing ? t('routines.editRoutine') : t('routines.newRoutine')}
          </Text>
          <Switch
            label={t('routines.enabled')}
            checked={value.enabled}
            onChange={(e) => onChange({ ...value, enabled: e.currentTarget.checked })}
            size="xs"
          />
        </Group>

        <TextInput
          label={t('routines.routineTitle')}
          placeholder={t('routines.routineTitlePlaceholder')}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          required
          data-autofocus
        />

        <TextInput
          label={t('routines.url')}
          placeholder={t('routines.urlPlaceholder')}
          value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          leftSection={<IconExternalLink size={14} />}
          rightSection={
            value.url ? (
              <Tooltip label={t('routines.openUrl')}>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  aria-label={t('routines.openUrl')}
                  onClick={() => onOpenUrl(value.url)}
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
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          autosize
          minRows={2}
          maxRows={4}
        />

        <div>
          <Text size="xs" fw={500} mb={4}>
            {t('routines.schedule')}
          </Text>
          <SegmentedControl
            value={value.scheduleType}
            onChange={(next) => {
              if (isRoutineScheduleType(next)) onChange({ ...value, scheduleType: next });
            }}
            fullWidth
            size="xs"
            data={[
              { label: t('routines.scheduleEveryday'), value: 'everyday' },
              { label: t('routines.scheduleWeekdays'), value: 'weekdays' },
              { label: t('routines.scheduleCustom'), value: 'custom' },
            ]}
          />
        </div>

        {value.scheduleType === 'custom' && (
          <Checkbox.Group value={value.customDays} onChange={(days) => onChange({ ...value, customDays: days })}>
            <Group gap="xs" mt={4}>
              {DAY_ORDER.map((day) => (
                <Checkbox key={day.value} value={day.value} label={t(day.labelKey)} size="xs" />
              ))}
            </Group>
          </Checkbox.Group>
        )}

        <Divider my="xs" />

        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button size="xs" onClick={onSave} disabled={!value.title.trim()}>
            {t('common.save')}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
};
