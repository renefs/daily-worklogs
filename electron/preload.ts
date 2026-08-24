import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  selectVaultDirectory: () => ipcRenderer.invoke('select-vault-directory'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  showAboutDialog: () => ipcRenderer.invoke('show-about-dialog'),
  readNote: (date: string) => ipcRenderer.invoke('read-note', date),
  writeNote: (date: string, content: string) => ipcRenderer.invoke('write-note', date, content),
  deleteNote: (date: string) => ipcRenderer.invoke('delete-note', date),
  listNotes: () => ipcRenderer.invoke('list-notes'),
  getNotesRange: (startDate: string, endDate: string) => ipcRenderer.invoke('get-notes-range', startDate, endDate),
  listTasks: () => ipcRenderer.invoke('list-tasks'),
  readTask: (filename: string) => ipcRenderer.invoke('read-task', filename),
  writeTask: (task: any) => ipcRenderer.invoke('write-task', task),
  updateTaskStatus: (filename: string, status: string) => ipcRenderer.invoke('update-task-status', filename, status),
  deleteTask: (filename: string) => ipcRenderer.invoke('delete-task', filename),
  renameTag: (oldName: string, newName: string) => ipcRenderer.invoke('rename-tag', oldName, newName),
  deleteTag: (tagName: string, removeFromTasks?: boolean) => ipcRenderer.invoke('delete-tag', tagName, removeFromTasks),
  saveTagDefinition: (tagDef: any) => ipcRenderer.invoke('save-tag-definition', tagDef),
  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
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
  onNoteFileChanged: (callback: (data: { date: string; content: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('note-file-changed', handler);
    return () => {
      ipcRenderer.removeListener('note-file-changed', handler);
    };
  },
  onOpenSettings: (callback: (tab?: string) => void) => {
    const handler = (_event: any, tab?: string) => callback(tab);
    ipcRenderer.on('open-settings', handler);
    return () => {
      ipcRenderer.removeListener('open-settings', handler);
    };
  },
});

