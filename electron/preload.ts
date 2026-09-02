import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { AppSettings, AreaDefinition, ProjectDefinition, TagDefinition, TaskPriority, TaskStatus } from '../src/types';

interface WriteTaskPayload {
  id?: string;
  taskId?: number;
  filename?: string;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  area?: string;
  project?: string;
  created?: string;
  due?: string;
  startedDate?: string;
  completedDate?: string;
  tags?: string[];
  content: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('save-settings', settings),
  getRoutineCompletions: (date: string) => ipcRenderer.invoke('get-routine-completions', date),
  updateRoutineCompletions: (date: string, routineIds: string[]) =>
    ipcRenderer.invoke('update-routine-completions', date, routineIds),
  selectVaultDirectory: () => ipcRenderer.invoke('select-vault-directory'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getMemoryMetrics: () => ipcRenderer.invoke('get-memory-metrics'),
  showAboutDialog: () => ipcRenderer.invoke('show-about-dialog'),
  readNote: (date: string) => ipcRenderer.invoke('read-note', date),
  writeNote: (date: string, content: string) => ipcRenderer.invoke('write-note', date, content),
  deleteNote: (date: string) => ipcRenderer.invoke('delete-note', date),
  listNotes: () => ipcRenderer.invoke('list-notes'),
  getNotesRange: (startDate: string, endDate: string) => ipcRenderer.invoke('get-notes-range', startDate, endDate),
  listTasks: () => ipcRenderer.invoke('list-tasks'),
  searchTaskContents: (query: string) => ipcRenderer.invoke('search-task-contents', query),
  readTask: (filename: string) => ipcRenderer.invoke('read-task', filename),
  writeTask: (task: WriteTaskPayload) => ipcRenderer.invoke('write-task', task),
  updateTaskStatus: (filename: string, status: TaskStatus) => ipcRenderer.invoke('update-task-status', filename, status),
  deleteTask: (filename: string) => ipcRenderer.invoke('delete-task', filename),
  renameTag: (oldName: string, newName: string) => ipcRenderer.invoke('rename-tag', oldName, newName),
  deleteTag: (tagName: string, removeFromTasks?: boolean) => ipcRenderer.invoke('delete-tag', tagName, removeFromTasks),
  saveTagDefinition: (tagDef: TagDefinition) => ipcRenderer.invoke('save-tag-definition', tagDef),
  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  renameArea: (oldName: string, newArea: AreaDefinition) => ipcRenderer.invoke('rename-area', oldName, newArea),
  renameProject: (oldName: string, newProject: ProjectDefinition, oldAreaName?: string) =>
    ipcRenderer.invoke('rename-project', oldName, newProject, oldAreaName),
  exportDocument: (payload: { title: string; defaultPath: string; content: string; format: string }) =>
    ipcRenderer.invoke('export-document', payload),
  openInFileManager: (filePath?: string) => ipcRenderer.invoke('open-in-file-manager', filePath),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  logTaskToDailyNote: (payload: { date?: string; taskTitle: string; status: string; priority?: string; filename?: string }) =>
    ipcRenderer.invoke('log-task-to-daily-note', payload),
  saveImage: (payload: { sourcePath?: string; buffer?: ArrayBuffer | Uint8Array; base64Data?: string; originalName?: string; mimeType?: string }) =>
    ipcRenderer.invoke('save-image', payload),
  selectImageDialog: () => ipcRenderer.invoke('select-image-dialog'),
  resolveMediaUrl: (path: string) => ipcRenderer.invoke('resolve-media-url', path),
  onNoteFileChanged: (callback: (data: { date: string; content: string; lastModified?: string; exists: boolean }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { date: string; content: string; lastModified?: string; exists: boolean }) => callback(data);
    ipcRenderer.on('note-file-changed', handler);
    return () => {
      ipcRenderer.removeListener('note-file-changed', handler);
    };
  },
  onVaultFilesChanged: (callback: (data: { relativePath: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { relativePath: string }) => callback(data);
    ipcRenderer.on('vault-files-changed', handler);
    return () => ipcRenderer.removeListener('vault-files-changed', handler);
  },
  onOpenSettings: (callback: (tab?: string) => void) => {
    const handler = (_event: IpcRendererEvent, tab?: string) => callback(tab);
    ipcRenderer.on('open-settings', handler);
    return () => {
      ipcRenderer.removeListener('open-settings', handler);
    };
  },
});
