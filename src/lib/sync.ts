import { upsertFolder, upsertReels } from './db';
import { scrapeAllSavedAnchors, convertAnchorsToReels } from '../content/scraper';
import type { Reel, SyncRange } from '../types';

export interface SyncProgressUpdate {
  done: number;
  total: number;
}

/**
 * Executes a full folder sync directly within the Content Script context
 * so that IndexedDB records are written to the correct domain origin (https://www.instagram.com).
 */
export async function executeFolderSync(
  folder: string,
  mode: SyncRange,
  onProgress?: (update: SyncProgressUpdate) => void
): Promise<{ added: number; updated: number }> {
  console.log(`[InstaSave Sync] Starting folder sync for "${folder}" with mode "${mode}"`);

  // 1. Gather all anchors by auto-scrolling DOM as required
  const anchors = await scrapeAllSavedAnchors(mode, (scrapedCount) => {
    onProgress?.({
      done: scrapedCount,
      total: mode === 'all' ? -1 : mode === '30' ? 30 : 50,
    });
  });

  if (anchors.length === 0) {
    await upsertFolder(folder);
    return { added: 0, updated: 0 };
  }

  // 2. Convert anchors to initial Reel records
  const reels: Reel[] = convertAnchorsToReels(anchors, folder);
  const total = reels.length;

  let totalAdded = 0;
  let totalUpdated = 0;

  // 3. Save initial reels into Content Script IndexedDB
  const initialResult = await upsertReels(reels);
  totalAdded += initialResult.added;
  totalUpdated += initialResult.updated;
  await upsertFolder(folder);

  onProgress?.({ done: total, total });

  // 4. Rate-limited gentle background enrichment for posts missing details
  try {
    await enrichReelsInBackgroundThrottled(reels, folder, onProgress);
  } catch (err) {
    console.warn('[InstaSave Sync] Metadata enrichment warning:', err);
  }

  return { added: totalAdded, updated: totalUpdated };
}

/**
 * Safely enriches missing metadata with a strict 1500ms delay per request to avoid HTTP 429 Rate Limits.
 */
async function enrichReelsInBackgroundThrottled(
  reels: Reel[],
  folder: string,
  onProgress?: (update: SyncProgressUpdate) => void
) {
  const needsEnrichment = reels.filter((r) => (!r.caption || !r.creator) && r.permalink);
  if (needsEnrichment.length === 0) return;

  for (let i = 0; i < needsEnrichment.length; i++) {
    const r = needsEnrichment[i];
    try {
      const meta = await chrome.runtime.sendMessage({
        type: 'FETCH_PERMALINK_META',
        permalink: r.permalink,
      });

      if (meta?.rateLimited) {
        console.warn('[InstaSave Sync] Rate limit detected (HTTP 429). Pausing background enrichment.');
        break; // Stop background fetching immediately on 429
      }

      if (meta) {
        if (meta.caption) r.caption = meta.caption;
        if (meta.creator) r.creator = meta.creator;
        if (meta.thumbnail) r.thumbnail = meta.thumbnail;
        if (meta.uploadedAt) r.uploadedAt = meta.uploadedAt;
        await upsertReels([r]);
        await upsertFolder(folder);
      }
    } catch {
      // Fallback silently
    }

    onProgress?.({ done: reels.length - needsEnrichment.length + i + 1, total: reels.length });

    // Throttle sequential requests with a 1500ms delay
    if (i < needsEnrichment.length - 1) {
      await new Promise((res) => setTimeout(res, 1500));
    }
  }
}
