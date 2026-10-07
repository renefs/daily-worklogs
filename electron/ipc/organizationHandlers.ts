import { ipcMain } from 'electron';
import type { AppSettings, AreaDefinition, ProjectDefinition, TagDefinition } from '../../src/types';

interface OrganizationHandlerDependencies {
  getSettings: () => AppSettings;
  saveSettings: (settings: Partial<AppSettings>) => void;
  defaultAreas: AreaDefinition[];
  ensureTasksDir: (vaultPath: string) => string;
  loadAllTasks: (tasksDir: string) => Promise<Array<{ tags?: string[] }>>;
  updateTaskFrontmatter: (
    tasksDir: string,
    mapper: (data: Record<string, unknown>) => Record<string, unknown> | null
  ) => Promise<number>;
}

export function registerOrganizationHandlers(dependencies: OrganizationHandlerDependencies): void {
  const { getSettings, saveSettings, defaultAreas, ensureTasksDir, loadAllTasks, updateTaskFrontmatter } = dependencies;

  ipcMain.handle('get-all-tags', async () => {
    const settings = getSettings();
    const tagMap = new Map<string, TagDefinition>();
    for (const tag of settings.tags || []) {
      if (tag?.name) tagMap.set(tag.name.toLowerCase(), { ...tag });
    }
    try {
      const tasksDir = ensureTasksDir(settings.vaultPath);
      for (const task of await loadAllTasks(tasksDir)) {
        for (const rawTag of task.tags || []) {
          const trimmed = String(rawTag).trim();
          if (!trimmed) continue;
          const lower = trimmed.toLowerCase();
          if (tagMap.has(lower)) continue;
          tagMap.set(lower, { name: trimmed });
        }
      }
    } catch (error) {
      console.error('Error scanning tasks for tags:', error);
    }
    return Array.from(tagMap.values());
  });

  ipcMain.handle('save-tag-definition', async (_event, tagDef: TagDefinition) => {
    if (!tagDef || !tagDef.name) return { success: false, error: 'Tag name required' };
    const currentTags: TagDefinition[] = getSettings().tags || [];
    const index = currentTags.findIndex((tag) => tag.name.toLowerCase() === tagDef.name.toLowerCase());
    if (index >= 0) currentTags[index] = { ...currentTags[index], ...tagDef };
    else currentTags.push(tagDef);
    saveSettings({ tags: currentTags });
    return { success: true };
  });

  ipcMain.handle('rename-tag', async (_event, oldName: string, newName: string) => {
    if (!oldName || !newName) return { success: false, error: 'Old and new name required', updatedCount: 0 };
    const cleanOld = oldName.trim();
    const cleanNew = newName.trim();
    if (cleanOld.toLowerCase() === cleanNew.toLowerCase()) return { success: true, updatedCount: 0 };

    const settings = getSettings();
    const currentTags: TagDefinition[] = settings.tags || [];
    let tagDefFound = false;
    const updatedTags = currentTags.map((tag) => {
      if (tag.name.toLowerCase() === cleanOld.toLowerCase()) {
        tagDefFound = true;
        return { ...tag, name: cleanNew };
      }
      return tag;
    });
    if (!tagDefFound) updatedTags.push({ name: cleanNew });
    saveSettings({ tags: updatedTags });

    let updatedCount = 0;
    try {
      updatedCount = await updateTaskFrontmatter(ensureTasksDir(settings.vaultPath), (data) => {
        if (!Array.isArray(data.tags)) return null;
        let modified = false;
        const newTags = data.tags.map((tag: unknown) => {
          if (String(tag).toLowerCase() === cleanOld.toLowerCase()) {
            modified = true;
            return cleanNew;
          }
          return tag;
        });
        return modified ? { ...data, tags: Array.from(new Set(newTags)) } : null;
      });
    } catch (error) {
      console.error('Error scanning task files during tag rename:', error);
    }
    return { success: true, updatedCount };
  });

  ipcMain.handle('delete-tag', async (_event, tagName: string, removeFromTasks = true) => {
    if (!tagName) return { success: false, error: 'Tag name required', updatedCount: 0 };
    const cleanName = tagName.trim().toLowerCase();
    const settings = getSettings();
    saveSettings({ tags: (settings.tags || []).filter((tag) => tag.name.toLowerCase() !== cleanName) });

    let updatedCount = 0;
    if (removeFromTasks) {
      try {
        updatedCount = await updateTaskFrontmatter(ensureTasksDir(settings.vaultPath), (data) => {
          const tags: unknown[] = Array.isArray(data.tags) ? data.tags : [];
          if (!tags.some((tag) => String(tag).toLowerCase() === cleanName)) return null;
          return { ...data, tags: tags.filter((tag) => String(tag).toLowerCase() !== cleanName) };
        });
      } catch (error) {
        console.error('Error scanning task files during tag delete:', error);
      }
    }
    return { success: true, updatedCount };
  });

  ipcMain.handle('rename-area', async (_event, oldName: string, newArea: AreaDefinition) => {
    if (!oldName || !newArea || !newArea.name) {
      return { success: false, error: 'Old and new name required', updatedCount: 0 };
    }
    const cleanOld = oldName.trim();
    const cleanNew = newArea.name.trim();
    const settings = getSettings();
    const currentAreas = settings.areas || defaultAreas;
    const currentProjects = settings.projects || [];
    const cleanId = newArea.id || cleanNew.toLowerCase().replace(/\s+/g, '-');
    const existingIndex = currentAreas.findIndex((area) => area.id === cleanId || area.name.toLowerCase() === cleanOld.toLowerCase());
    const updatedAreas = [...currentAreas];
    if (existingIndex >= 0) updatedAreas[existingIndex] = { ...currentAreas[existingIndex], ...newArea, id: cleanId, name: cleanNew };
    else updatedAreas.push({ ...newArea, id: cleanId, name: cleanNew });
    const updatedProjects = currentProjects.map((project) =>
      (project.areaName || '').toLowerCase() === cleanOld.toLowerCase() ? { ...project, areaName: cleanNew } : project
    );
    saveSettings({ areas: updatedAreas, projects: updatedProjects });

    let updatedCount = 0;
    if (cleanOld.toLowerCase() !== cleanNew.toLowerCase()) {
      try {
        updatedCount = await updateTaskFrontmatter(ensureTasksDir(settings.vaultPath), (data) =>
          data.area && String(data.area).toLowerCase() === cleanOld.toLowerCase() ? { ...data, area: cleanNew } : null
        );
      } catch (error) {
        console.error('Error scanning task files during area rename:', error);
      }
    }
    return { success: true, updatedCount, areas: updatedAreas, projects: updatedProjects };
  });

  ipcMain.handle('rename-project', async (_event, oldName: string, newProject: ProjectDefinition, oldAreaName?: string) => {
    if (!oldName || !newProject || !newProject.name) {
      return { success: false, error: 'Old and new name required', updatedCount: 0 };
    }
    const cleanOld = oldName.trim();
    const cleanNew = newProject.name.trim();
    const settings = getSettings();
    const currentProjects = settings.projects || [];
    const cleanId = newProject.id || cleanNew.toLowerCase().replace(/\s+/g, '-');
    const existingIndex = currentProjects.findIndex((project) => project.id === cleanId
      || (project.name.toLowerCase() === cleanOld.toLowerCase()
        && (!oldAreaName || (project.areaName || '').toLowerCase() === oldAreaName.toLowerCase())));
    const updatedProjects = [...currentProjects];
    if (existingIndex >= 0) updatedProjects[existingIndex] = { ...currentProjects[existingIndex], ...newProject, id: cleanId, name: cleanNew };
    else updatedProjects.push({ ...newProject, id: cleanId, name: cleanNew });
    saveSettings({ projects: updatedProjects });

    let updatedCount = 0;
    const isNameChanged = cleanOld.toLowerCase() !== cleanNew.toLowerCase();
    const isAreaChanged = Boolean(oldAreaName && oldAreaName.toLowerCase() !== (newProject.areaName || '').toLowerCase());
    if (isNameChanged || isAreaChanged) {
      try {
        updatedCount = await updateTaskFrontmatter(ensureTasksDir(settings.vaultPath), (data) => {
          const matchesProject = data.project && String(data.project).toLowerCase() === cleanOld.toLowerCase();
          const matchesArea = !oldAreaName || (data.area && String(data.area).toLowerCase() === oldAreaName.toLowerCase());
          if (!matchesProject || !matchesArea) return null;
          const updatedData: Record<string, unknown> = { ...data, project: cleanNew };
          if (newProject.areaName) updatedData.area = newProject.areaName;
          return updatedData;
        });
      } catch (error) {
        console.error('Error scanning task files during project rename:', error);
      }
    }
    return { success: true, updatedCount, projects: updatedProjects };
  });
}
