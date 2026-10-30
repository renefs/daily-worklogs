import { describe, expect, it } from 'vitest';
import {
  EMPTY_ROUTINE_FORM,
  formDataToRoutine,
  isRoutineScheduleType,
  routineToFormData,
} from '../../../src/components/settings/routines/routineFormData';
import type { DailyRoutine } from '../../../src/types';

describe('routine form data', () => {
  it('round-trips a custom schedule and keeps days sorted', () => {
    const routine: DailyRoutine = { id: 'r1', title: 'Water plants', schedule: [3, 1], enabled: true };
    const form = routineToFormData(routine);
    expect(form.scheduleType).toBe('custom');
    expect(form.customDays).toEqual(['3', '1']);
    expect(formDataToRoutine(form).schedule).toEqual([1, 3]);
  });

  it('trims text and drops empty optional fields', () => {
    const routine = formDataToRoutine({ ...EMPTY_ROUTINE_FORM, id: 'r2', title: '  Standup  ', url: ' ', description: '' });
    expect(routine).toEqual({
      id: 'r2',
      title: 'Standup',
      url: undefined,
      description: undefined,
      schedule: 'everyday',
      enabled: true,
    });
  });

  it('validates schedule types', () => {
    expect(isRoutineScheduleType('weekdays')).toBe(true);
    expect(isRoutineScheduleType('monthly')).toBe(false);
  });
});
