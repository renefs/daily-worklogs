import { ipcMain } from 'electron';
import { searchVault, invalidateVaultSearchCache, type VaultSearchResult } from '../services/vaultSearchService';

interface SearchHandlerDependencies {
  getVaultPath: () => string;
}

export function registerSearchHandlers(dependencies: SearchHandlerDependencies): void {
  const { getVaultPath } = dependencies;

  ipcMain.handle('search-vault', async (_event, rawQuery: unknown): Promise<VaultSearchResult[]> => {
    const query = String(rawQuery || '').trim();
    if (!query) return [];
    try {
      const vaultPath = getVaultPath();
      return await searchVault(vaultPath, query);
    } catch (error) {
      console.error('Error during vault search:', error);
      return [];
    }
  });

  ipcMain.handle('search-note-contents', async (_event, rawQuery: unknown): Promise<string[]> => {
    const query = String(rawQuery || '').trim();
    if (!query) return [];
    try {
      const vaultPath = getVaultPath();
      const results = await searchVault(vaultPath, query, 100);
      return results.filter((r) => r.type === 'note').map((r) => r.id);
    } catch (error) {
      console.error('Error searching note contents:', error);
      return [];
    }
  });

  ipcMain.handle('invalidate-search-cache', () => {
    invalidateVaultSearchCache();
    return { success: true };
  });
}
