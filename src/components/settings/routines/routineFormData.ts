import { DailyRoutine, RoutineSchedule } from '../../../types';

export type RoutineScheduleType = 'everyday' | 'weekdays' | 'custom';

export interface RoutineFormData {
  id?: string;
  title: string;
  url: string;
  description: string;
  scheduleType: RoutineScheduleType;
  customDays: string[]; // ['0', '1', ...] where 0 is Sunday
  enabled: boolean;
}

const WORK_WEEK_DAYS = ['1', '2', '3', '4', '5'];

export const EMPTY_ROUTINE_FORM: RoutineFormData = {
  title: '',
  url: '',
  description: '',
  scheduleType: 'everyday',
  customDays: WORK_WEEK_DAYS,
  enabled: true,
};

export function isRoutineScheduleType(value: string): value is RoutineScheduleType {
  return value === 'everyday' || value === 'weekdays' || value === 'custom';
}

export function routineToFormData(routine: DailyRoutine): RoutineFormData {
  const isCustom = Array.isArray(routine.schedule);
  return {
    id: routine.id,
    title: routine.title,
    url: routine.url || '',
    description: routine.description || '',
    scheduleType: isCustom ? 'custom' : (routine.schedule as 'everyday' | 'weekdays'),
    customDays: Array.isArray(routine.schedule) ? routine.schedule.map(String) : WORK_WEEK_DAYS,
    enabled: routine.enabled,
  };
}

export function formDataToRoutine(form: RoutineFormData): DailyRoutine {
  let schedule: RoutineSchedule = 'everyday';
  if (form.scheduleType === 'weekdays') {
    schedule = 'weekdays';
  } else if (form.scheduleType === 'custom') {
    schedule = form.customDays.map(Number).sort((a, b) => a - b);
  }
  return {
    id: form.id || `routine-${Date.now()}`,
    title: form.title.trim(),
    url: form.url.trim() ? form.url.trim() : undefined,
    description: form.description.trim() ? form.description.trim() : undefined,
    schedule,
    enabled: form.enabled,
  };
}
