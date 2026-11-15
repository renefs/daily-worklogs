import React from 'react';
import { Badge, Highlight, Text } from '@mantine/core';
import { Spotlight } from '@mantine/spotlight';
import { IconChecklist, IconFileText } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { KanbanColumnConfig, VaultSearchResult } from '../../types';
import { formatLocalizedDateTitle } from '../../utils/dateFormat';
import { getColumnTitle } from '../kanban/columnUtils';
import classes from './AppSpotlight.module.css';

interface SpotlightRowProps {
  icon: React.ReactNode;
  onSelect: () => void;
  children: React.ReactNode;
}

/**
 * Spotlight.Action drops `leftSection` when it receives children, so rows with custom
 * content render their icon themselves.
 */
export const SpotlightRow: React.FC<SpotlightRowProps> = ({ icon, onSelect, children }) => (
  <Spotlight.Action className={classes.action} onClick={onSelect}>
    <span className={classes.icon}>{icon}</span>
    <div className={classes.result}>{children}</div>
  </Spotlight.Action>
);

interface ResultSnippetProps {
  snippet: string;
  highlight: string[];
}

const ResultSnippet: React.FC<ResultSnippetProps> = ({ snippet, highlight }) => (
  <Highlight highlight={highlight} size="xs" lineClamp={2} className={classes.snippet}>
    {snippet}
  </Highlight>
);

interface NoteResultActionProps {
  result: VaultSearchResult;
  highlight: string[];
  onSelect: (date: string) => void;
}

export const NoteResultAction: React.FC<NoteResultActionProps> = ({ result, highlight, onSelect }) => {
  const { t, i18n } = useTranslation();
  return (
    <SpotlightRow icon={<IconFileText size={18} />} onSelect={() => onSelect(result.id)}>
      <div className={classes.resultHeader}>
        <Text size="sm" fw={600} truncate className={classes.resultTitle}>
          {formatLocalizedDateTitle(result.id, i18n.language)}
        </Text>
        <Badge size="xs" variant="default" className={classes.badge}>
          {result.id}
        </Badge>
      </div>
      {result.snippet ? (
        <ResultSnippet snippet={result.snippet} highlight={highlight} />
      ) : (
        <Text size="xs" fs="italic" className={classes.snippet}>
          {t('spotlight.emptyNote')}
        </Text>
      )}
    </SpotlightRow>
  );
};

interface TaskResultActionProps {
  result: VaultSearchResult;
  highlight: string[];
  columns: KanbanColumnConfig[];
  onSelect: (filename: string) => void;
}

export const TaskResultAction: React.FC<TaskResultActionProps> = ({ result, highlight, columns, onSelect }) => {
  const { t } = useTranslation();
  const column = columns.find((col) => col.id === result.status);
  const statusLabel = column ? getColumnTitle(column, t) : result.status;

  return (
    <SpotlightRow icon={<IconChecklist size={18} />} onSelect={() => onSelect(result.id)}>
      <div className={classes.resultHeader}>
        {result.taskId !== undefined && (
          <Badge size="xs" variant="default" className={classes.badge}>
            #{result.taskId}
          </Badge>
        )}
        <Highlight highlight={highlight} size="sm" fw={600} truncate className={classes.resultTitle}>
          {result.title}
        </Highlight>
        {statusLabel && (
          <Badge size="xs" variant="light" color={column?.color || 'blue'} className={classes.badge}>
            {statusLabel}
          </Badge>
        )}
      </div>
      {result.snippet && <ResultSnippet snippet={result.snippet} highlight={highlight} />}
    </SpotlightRow>
  );
};
