import React, { useMemo } from 'react';
import { Group, Text, Badge, Progress } from '@mantine/core';
import { IconListCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export interface TaskChecklistProgressProps {
  content: string;
}

export const TaskChecklistProgress: React.FC<TaskChecklistProgressProps> = ({ content }) => {
  const { t } = useTranslation();

  const { total, completed, percent } = useMemo(() => {
    if (!content) return { total: 0, completed: 0, percent: 0 };
    const matches = content.match(/^[ \t]*-[ \t]+\[([ xX])\]/gm) || [];
    const totalCount = matches.length;
    if (totalCount === 0) return { total: 0, completed: 0, percent: 0 };
    const completedCount = matches.filter((m) => /\[[xX]\]/.test(m)).length;
    const pct = Math.round((completedCount / totalCount) * 100);
    return { total: totalCount, completed: completedCount, percent: pct };
  }, [content]);

  if (total === 0) return null;

  return (
    <div style={{ width: '100%' }}>
      <Group justify="space-between" align="center" mb={6}>
        <Group gap={6}>
          <IconListCheck size={14} style={{ color: 'var(--app-text-secondary)' }} />
          <Text
            size="xs"
            fw={700}
            style={{
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              color: 'var(--app-text-secondary)',
            }}
          >
            {t('tasks.checklistProgress', 'Checklist')}
          </Text>
        </Group>
        <Badge
          size="xs"
          variant="light"
          color={percent === 100 ? 'teal' : 'primary'}
          radius="sm"
        >
          {completed}/{total} ({percent}%)
        </Badge>
      </Group>
      <Progress
        value={percent}
        size="sm"
        radius="xl"
        color={percent === 100 ? 'teal' : 'primary'}
        animated={percent > 0 && percent < 100}
      />
    </div>
  );
};
