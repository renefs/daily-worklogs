import { DailyRoutine } from '../../types';
import { AppSlice, RoutinesSlice } from '../types';

export const createRoutinesSlice: AppSlice<RoutinesSlice> = (set, get) => ({
  isRoutinesDrawerOpen: false,
  routineCompletionsByDate: {},

  loadRoutineCompletions: async (date: string) => {
    if (!window.electronAPI) return;
    const routineIds = await window.electronAPI.getRoutineCompletions(date);
    set((state) => ({
      routineCompletionsByDate: {
        ...state.routineCompletionsByDate,
        [date]: routineIds,
      },
    }));
  },

  toggleRoutineCompletion: async (date: string, routineId: string) => {
    if (!window.electronAPI) return;
    const dateCompletions = new Set(get().routineCompletionsByDate[date] || []);
    if (dateCompletions.has(routineId)) {
      dateCompletions.delete(routineId);
    } else {
      dateCompletions.add(routineId);
    }
    const updated = await window.electronAPI.updateRoutineCompletions(date, Array.from(dateCompletions));
    set((state) => ({
      routineCompletionsByDate: { ...state.routineCompletionsByDate, [date]: updated },
    }));
  },

  completeAllDailyRoutines: async (date: string, routineIds: string[]) => {
    if (!window.electronAPI) return;
    const current = get().routineCompletionsByDate[date] || [];
    const updated = await window.electronAPI.updateRoutineCompletions(
      date,
      Array.from(new Set([...current, ...routineIds]))
    );
    set((state) => ({
      routineCompletionsByDate: { ...state.routineCompletionsByDate, [date]: updated },
    }));
  },

  resetDailyRoutines: async (date: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.updateRoutineCompletions(date, []);
    set((state) => {
      const routineCompletionsByDate = { ...state.routineCompletionsByDate };
      delete routineCompletionsByDate[date];
      return { routineCompletionsByDate };
    });
  },

  saveRoutinesList: async (routines: DailyRoutine[]) => {
    await get().updateSettings({ routines });
  },

  toggleRoutinesDrawer: (open?: boolean) => {
    set((state) => ({
      isRoutinesDrawerOpen: typeof open === 'boolean' ? open : !state.isRoutinesDrawerOpen,
    }));
  },
});
