import { useEffect, useState } from 'react';
import type { VaultSearchResult } from '../../types';

const SEARCH_DEBOUNCE_MS = 150;

interface VaultSearchState {
  /** Query the current results belong to. */
  query: string;
  results: VaultSearchResult[];
}

/**
 * Debounced vault search. Responses for an outdated query are dropped, so a slow
 * earlier request can never overwrite the results of the latest one.
 */
export function useVaultSearch(query: string): { results: VaultSearchResult[]; isSearching: boolean } {
  const [state, setState] = useState<VaultSearchState>({ query: '', results: [] });

  useEffect(() => {
    if (!query || !window.electronAPI?.searchVault) return;

    let active = true;
    const timeout = setTimeout(async () => {
      try {
        const results = await window.electronAPI.searchVault(query);
        if (active) setState({ query, results: results ?? [] });
      } catch (err) {
        console.error('Spotlight search error:', err);
        if (active) setState({ query, results: [] });
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  if (!query) return { results: [], isSearching: false };
  const isCurrent = state.query === query;
  // Keep showing the previous results while the next ones load, to avoid flicker.
  return { results: state.results, isSearching: !isCurrent && Boolean(window.electronAPI?.searchVault) };
}
