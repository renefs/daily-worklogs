import React from 'react';
import {
  IconInbox,
  IconCircleDot,
  IconPlayerPlay,
  IconHourglass,
  IconCircleCheck,
  IconCircleX,
  IconArchive,
  IconEye,
  IconFlame,
  IconTag,
  IconFlag,
  IconAlertCircle,
  IconSparkles,
  IconClock,
} from '@tabler/icons-react';
import { ColumnBehavior, KanbanColumnConfig } from '../../types';

export const AVAILABLE_COLUMN_ICONS = [
  { value: 'inbox', label: 'Inbox / Backlog', icon: <IconInbox size={16} /> },
  { value: 'circle-dot', label: 'Circle Dot / Todo', icon: <IconCircleDot size={16} /> },
  { value: 'player-play', label: 'Play / In Progress', icon: <IconPlayerPlay size={16} /> },
  { value: 'hourglass', label: 'Hourglass / Waiting', icon: <IconHourglass size={16} /> },
  { value: 'circle-check', label: 'Check / Done', icon: <IconCircleCheck size={16} /> },
  { value: 'circle-x', label: 'X / Cancelled', icon: <IconCircleX size={16} /> },
  { value: 'eye', label: 'Eye / Review', icon: <IconEye size={16} /> },
  { value: 'archive', label: 'Archive', icon: <IconArchive size={16} /> },
  { value: 'flame', label: 'Flame / Hot', icon: <IconFlame size={16} /> },
  { value: 'alert-circle', label: 'Alert / Blocked', icon: <IconAlertCircle size={16} /> },
  { value: 'sparkles', label: 'Sparkles / Ideas', icon: <IconSparkles size={16} /> },
  { value: 'clock', label: 'Clock / Scheduled', icon: <IconClock size={16} /> },
  { value: 'flag', label: 'Flag', icon: <IconFlag size={16} /> },
  { value: 'tag', label: 'Tag', icon: <IconTag size={16} /> },
];

export const AVAILABLE_COLUMN_COLORS = [
  'gray',
  'blue',
  'indigo',
  'cyan',
  'teal',
  'green',
  'yellow',
  'orange',
  'red',
  'pink',
  'grape',
  'violet',
];

export function getColumnIcon(iconName?: string, size = 16): React.ReactNode {
  switch (iconName) {
    case 'inbox':
      return <IconInbox size={size} />;
    case 'circle-dot':
      return <IconCircleDot size={size} />;
    case 'player-play':
      return <IconPlayerPlay size={size} />;
    case 'hourglass':
      return <IconHourglass size={size} />;
    case 'circle-check':
      return <IconCircleCheck size={size} />;
    case 'circle-x':
      return <IconCircleX size={size} />;
    case 'eye':
      return <IconEye size={size} />;
    case 'archive':
      return <IconArchive size={size} />;
    case 'flame':
      return <IconFlame size={size} />;
    case 'alert-circle':
      return <IconAlertCircle size={size} />;
    case 'sparkles':
      return <IconSparkles size={size} />;
    case 'clock':
      return <IconClock size={size} />;
    case 'flag':
      return <IconFlag size={size} />;
    case 'tag':
      return <IconTag size={size} />;
    default:
      return <IconCircleDot size={size} />;
  }
}

export function getColumnTitle(col: KanbanColumnConfig, t: (key: string, options?: any) => string): string {
  if (col.titleKey) {
    const translated = t(col.titleKey);
    if (translated && translated !== col.titleKey) {
      return translated;
    }
  }
  return col.title || col.id;
}

export function getBehaviorLabel(behavior: ColumnBehavior, t: (key: string, options?: any) => string): string {
  switch (behavior) {
    case 'done':
      return t('settings.behaviorDone');
    case 'cancelled':
      return t('settings.behaviorCancelled');
    case 'in_progress':
      return t('settings.behaviorInProgress');
    case 'waiting':
      return t('settings.behaviorWaiting');
    case 'todo':
      return t('settings.behaviorTodo');
    case 'backlog':
      return t('settings.behaviorBacklog');
    default:
      return behavior;
  }
}
