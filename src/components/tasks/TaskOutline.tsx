import React, { useMemo } from 'react';
import { Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import classes from '../views/TaskView.module.css';

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export interface TaskOutlineProps {
  content: string;
  onScrollToHeading: (id: string) => void;
}

export const TaskOutline: React.FC<TaskOutlineProps> = ({ content, onScrollToHeading }) => {
  const { t } = useTranslation();

  const headings = useMemo(() => {
    if (!content) return [];
    const lines = content.split('\n');
    const items: HeadingItem[] = [];

    lines.forEach((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        items.push({ id, text, level });
      }
    });

    return items;
  }, [content]);

  if (headings.length === 0) {
    return (
      <Text size="xs" c="dimmed" py={4} fs="italic">
        {t('tasks.noHeadings', 'No headings in document')}
      </Text>
    );
  }

  return (
    <Stack gap={2} mt={4}>
      {headings.map((h, idx) => (
        <button
          key={`${h.id}-${idx}`}
          type="button"
          className={clsx(
            classes.tocItem,
            classes[`level${h.level}` as keyof typeof classes],
            'task-toc-item',
            `level-${h.level}`
          )}
          onClick={() => onScrollToHeading(h.id)}
        >
          <span style={{ opacity: 0.5, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
            {'#'.repeat(h.level)}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {h.text}
          </span>
        </button>
      ))}
    </Stack>
  );
};
