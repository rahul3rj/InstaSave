import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, getSettings, upsertFolder } from '../lib/db';
import { aggregateTags, type TagCount } from '../lib/tags';
import { searchReels } from '../lib/search';
import { executeFolderSync } from '../lib/sync';
import type { Reel, Settings, SyncRange } from '../types';
import { SearchBar } from '../components/SearchBar';
import { SyncMenu } from '../components/SyncMenu';
import { TagStrip } from '../components/TagStrip';
import { ResultsGrid } from '../components/ResultsGrid';
import { SettingsPopover } from '../components/SettingsPopover';

interface Props {
  shadow: ShadowRoot;
  folder: string;
}

export function Root({ folder }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Reel[]>([]);
  const [allInFolder, setAllInFolder] = useState<Reel[]>([]);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [syncing, setSyncing] = useState<{ done: number; total: number } | null>(null);

  const refreshFolder = useCallback(async () => {
    const reels = await db.reels.where('folder').equals(folder).toArray();
    setAllInFolder(reels);
    setTags(aggregateTags(reels, 20));
  }, [folder]);

  // Initial load: settings + folder reels
  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setSettings(s);
      await upsertFolder(folder);
      await refreshFolder();
    })();
  }, [folder, refreshFolder]);

  // Trigger sync function calling executeFolderSync directly in Content Script origin
  const triggerSync = useCallback(
    async (mode: SyncRange) => {
      setSyncing({ done: 0, total: mode === 'all' ? -1 : Number(mode) });
      try {
        await executeFolderSync(folder, mode, (update) => {
          setSyncing(update);
        });
      } catch (err) {
        console.error('[InstaSave] Folder sync error:', err);
      } finally {
        setSyncing(null);
        await refreshFolder();
      }
    },
    [folder, refreshFolder]
  );

  // Listen for scheduled auto sync trigger
  useEffect(() => {
    function onMsg(msg: any) {
      if (msg?.type === 'TRIGGER_AUTO_SYNC') {
        triggerSync(settings?.defaultSyncRange ?? '30');
      }
    }
    chrome.runtime.onMessage.addListener(onMsg);
    return () => chrome.runtime.onMessage.removeListener(onMsg);
  }, [settings, triggerSync]);

  // Re-run search when query or folder reels change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const scored = await searchReels(query, folder);
      if (!cancelled) setResults(scored.map((s) => s.reel));
    })();
    return () => {
      cancelled = true;
    };
  }, [query, folder, allInFolder]);

  const topTags = useMemo(() => tags, [tags]);

  return (
    <div className="is-root bg-transparent text-white font-sans w-full">
      <div className="py-5">
        {/* Header Control Row matching Instagram Search Bar UI */}
        <div className="flex items-center gap-2 mb-2">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search"
            className="flex-1"
          />

          <SyncMenu
            syncing={syncing}
            onSync={triggerSync}
            defaultRange={settings?.defaultSyncRange ?? '30'}
          />

          <SettingsPopover folder={folder} onChange={setSettings} settings={settings} />
        </div>

        {/* Tag Pills */}
        {topTags.length > 0 && (
          <TagStrip tags={topTags} onPick={(t) => setQuery(`#${t}`)} activeTag={tagFromQuery(query)} />
        )}

        {/* Sync Progress Toast */}
        {syncing && (
          <div className="mt-2 text-xs text-gray-400 flex items-center justify-between bg-[#25292E] rounded-full px-4 py-1.5 animate-pulse">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Syncing posts...
            </span>
            <span className="font-semibold text-white">
              {syncing.total < 0 ? `${syncing.done} indexed` : `${syncing.done} / ${syncing.total}`}
            </span>
          </div>
        )}
      </div>

      {/* Results View Overlay (only active when search query is typed) */}
      {query.trim() && (
        <div className="py-2 bg-transparent min-h-screen">
          <div className="text-xs text-gray-400 mb-2 flex items-center justify-between border-t border-[#262626] pt-3 px-1">
            <span>
              Search results for <strong className="text-white">"{query}"</strong>
            </span>
            <span className="text-white font-medium">{results.length} matched</span>
          </div>
          <ResultsGrid reels={results} />
        </div>
      )}
    </div>
  );
}

function tagFromQuery(q: string): string | null {
  const t = q.trim();
  if (t.startsWith('#')) return t.slice(1).toLowerCase();
  return null;
}
