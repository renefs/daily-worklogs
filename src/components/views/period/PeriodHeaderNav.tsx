import React from 'react';
import { Group, Title, Text, Button, ActionIcon, Menu, UnstyledButton } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconFileExport,
  IconDotsVertical,
  IconCalendar,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export interface PeriodHeaderNavProps {
  title: string;
  subtitle?: string;
  pickerLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onCurrent: () => void;
  currentPeriodLabel: string;
  onExport: () => void;
  onCopyReport: () => void;
  activeTab: 'dashboard' | 'days' | 'tasks';
  onTabChange: (tab: 'dashboard' | 'days' | 'tasks') => void;
}

export const PeriodHeaderNav: React.FC<PeriodHeaderNavProps> = ({
  title,
  subtitle,
  pickerLabel,
  onPrev,
  onNext,
  onCurrent,
  currentPeriodLabel,
  onExport,
  onCopyReport,
  activeTab,
  onTabChange,
}) => {
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Title order={2} style={{ letterSpacing: '-0.02em', fontSize: 22, fontWeight: 700 }}>
            {title}
          </Title>
          {subtitle && (
            <Text size="xs" c="dimmed" mt={2}>
              {subtitle}
            </Text>
          )}
        </div>

        <Group gap="xs" wrap="nowrap">
          <Button
            variant="default"
            size="xs"
            leftSection={<IconFileExport size={14} />}
            onClick={onExport}
            radius="md"
          >
            {t('weekly.exportReport', 'Export report')}
          </Button>

          <Menu position="bottom-end" shadow="md" width={180}>
            <Menu.Target>
              <ActionIcon variant="default" size="sm" radius="md">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconCopy size={14} />} onClick={onCopyReport}>
                {t('weekly.copyReport', 'Copy report')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {/* Period Navigation Controls */}
      <Group gap={6} wrap="nowrap">
        <ActionIcon variant="default" size="sm" onClick={onPrev} radius="md">
          <IconChevronLeft size={16} />
        </ActionIcon>
        <Button
          variant="default"
          size="xs"
          radius="md"
          leftSection={<IconCalendar size={14} />}
          style={{ fontWeight: 500 }}
        >
          {pickerLabel}
        </Button>
        <ActionIcon variant="default" size="sm" onClick={onNext} radius="md">
          <IconChevronRight size={16} />
        </ActionIcon>
        <Button
          variant="default"
          size="xs"
          onClick={onCurrent}
          radius="md"
          style={{ fontWeight: 500 }}
        >
          {currentPeriodLabel}
        </Button>
      </Group>

      {/* Underline Sub-Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          borderBottom: '1px solid var(--app-card-border)',
          paddingBottom: 0,
        }}
      >
        {[
          { key: 'dashboard', label: t('dashboard.summary', 'Overview') },
          { key: 'days', label: t('reports.entriesTab', 'Entries') },
          { key: 'tasks', label: t('reports.taskBreakdownTab', 'Task breakdown') },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <UnstyledButton
              key={tab.key}
              onClick={() => onTabChange(tab.key as any)}
              style={{
                padding: '6px 2px 10px 2px',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive
                  ? 'var(--mantine-primary-color-filled)'
                  : 'var(--app-text-secondary)',
                borderBottom: isActive
                  ? '2px solid var(--mantine-primary-color-filled)'
                  : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </UnstyledButton>
          );
        })}
      </div>
    </div>
  );
};
