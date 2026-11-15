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
      // The sidebar filters its full note list with these dates, so no limit applies.
      const results = await searchVault(vaultPath, query, { types: ['note'], limitPerType: Number.POSITIVE_INFINITY });
      return results.map((r) => r.id);
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
