import { AreaDefinition, ProjectDefinition } from '../../types';
import { DEFAULT_AREAS } from '../../utils/areaProjectUtils';
import { AppSlice, AreasProjectsSlice } from '../types';

export const createAreasProjectsSlice: AppSlice<AreasProjectsSlice> = (_set, get) => ({
  areas: DEFAULT_AREAS,
  projects: [],

  saveArea: async (area: AreaDefinition, oldName?: string) => {
    const effectiveOldName = oldName || area.name;
    const isRename = effectiveOldName.trim().toLowerCase() !== area.name.trim().toLowerCase();

    if (window.electronAPI?.renameArea) {
      await window.electronAPI.renameArea(effectiveOldName, area);
      await get().loadSettings();
      await get().refreshTasksList();
      return;
    }

    const currentAreas = get().areas || DEFAULT_AREAS;
    const cleanId = area.id || area.name.toLowerCase().replace(/\s+/g, '-');
    const existingIndex = currentAreas.findIndex(
      (a) => a.id === cleanId || a.name.toLowerCase() === effectiveOldName.toLowerCase()
    );

    let updatedAreas: AreaDefinition[];
    if (existingIndex >= 0) {
      updatedAreas = [...currentAreas];
      updatedAreas[existingIndex] = { ...area, id: cleanId };
    } else {
      updatedAreas = [...currentAreas, { ...area, id: cleanId }];
    }

    // Cascade rename to child projects
    let updatedProjects = get().projects || [];
    if (isRename) {
      updatedProjects = updatedProjects.map((p) =>
        (p.areaName || '').toLowerCase() === effectiveOldName.toLowerCase()
          ? { ...p, areaName: area.name }
          : p
      );
    }

    await get().updateSettings({ areas: updatedAreas, projects: updatedProjects });
    await get().refreshTasksList();
  },

  deleteArea: async (areaIdOrName: string) => {
    const currentAreas = get().areas || DEFAULT_AREAS;
    const clean = areaIdOrName.toLowerCase();
    const areaToRemove = currentAreas.find(
      (a) => a.id.toLowerCase() === clean || a.name.toLowerCase() === clean
    );
    const updatedAreas = currentAreas.filter(
      (a) => a.id.toLowerCase() !== clean && a.name.toLowerCase() !== clean
    );
    // Without any area left, projects keep their name and show up as unassigned instead of pointing at a phantom area.
    const targetArea = updatedAreas[0]?.name;
    const updatedProjects = (get().projects || []).map((p) =>
      targetArea && areaToRemove && (p.areaName || '').toLowerCase() === areaToRemove.name.toLowerCase()
        ? { ...p, areaName: targetArea }
        : p
    );
    await get().updateSettings({ areas: updatedAreas, projects: updatedProjects });
    await get().refreshTasksList();
  },

  saveProject: async (project: ProjectDefinition, oldName?: string, oldAreaName?: string) => {
    const effectiveOldName = oldName || project.name;
    const effectiveOldArea = oldAreaName || project.areaName;

    if (window.electronAPI?.renameProject) {
      await window.electronAPI.renameProject(effectiveOldName, project, effectiveOldArea);
      await get().loadSettings();
      await get().refreshTasksList();
      return;
    }

    const currentProjects = get().projects || [];
    const cleanId = project.id || project.name.toLowerCase().replace(/\s+/g, '-');
    const existingIndex = currentProjects.findIndex(
      (p) =>
        p.id === cleanId ||
        (p.name.toLowerCase() === effectiveOldName.toLowerCase() &&
          (p.areaName || '').toLowerCase() === effectiveOldArea.toLowerCase())
    );

    let updatedProjects: ProjectDefinition[];
    if (existingIndex >= 0) {
      updatedProjects = [...currentProjects];
      updatedProjects[existingIndex] = { ...project, id: cleanId };
    } else {
      updatedProjects = [...currentProjects, { ...project, id: cleanId }];
    }

    await get().updateSettings({ projects: updatedProjects });
    await get().refreshTasksList();
  },

  deleteProject: async (projectIdOrName: string) => {
    const currentProjects = get().projects || [];
    const clean = projectIdOrName.toLowerCase();
    const updatedProjects = currentProjects.filter(
      (p) => p.id.toLowerCase() !== clean && p.name.toLowerCase() !== clean
    );
    await get().updateSettings({ projects: updatedProjects });
    await get().refreshTasksList();
  },
});
