import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  selectVaultDirectory: () => ipcRenderer.invoke('select-vault-directory'),
  getDefaultVaultPath: () => ipcRenderer.invoke('get-default-vault-path'),
  readNote: (date: string) => ipcRenderer.invoke('read-note', date),
  writeNote: (date: string, content: string) => ipcRenderer.invoke('write-note', date, content),
  deleteNote: (date: string) => ipcRenderer.invoke('delete-note', date),
  listNotes: () => ipcRenderer.invoke('list-notes'),
  getNotesRange: (startDate: string, endDate: string) => ipcRenderer.invoke('get-notes-range', startDate, endDate),
  exportDocument: (payload: { title: string; defaultPath: string; content: string; format: string }) =>
    ipcRenderer.invoke('export-document', payload),
  openInFileManager: (filePath?: string) => ipcRenderer.invoke('open-in-file-manager', filePath),
  onNoteFileChanged: (callback: (data: { date: string; content: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('note-file-changed', handler);
    return () => {
      ipcRenderer.removeListener('note-file-changed', handler);
    };
  },
});
