import { db } from './db';
import type { Reel } from '../types';

export interface ScoredReel {
  reel: Reel;
  score: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Search reels in IndexedDB by caption text and/or hashtags.
 *
 * Results are ranked by match relevance score, with strong recency boosting
 * derived from the reel's uploadedAt publication timestamp.
 */
export async function searchReels(query: string, folder?: string, limit = 60): Promise<ScoredReel[]> {
  const q = query.trim();
  if (!q) return [];

  const baseQuery = folder ? db.reels.where('folder').equals(folder) : db.reels.toCollection();
  const all: Reel[] = await baseQuery.toArray();

  const now = Date.now();
  const scored: ScoredReel[] = [];

  if (q.startsWith('#')) {
    const tag = q.slice(1).toLowerCase();
    if (!tag) return [];
    for (const r of all) {
      if (r.hashtags.includes(tag)) {
        scored.push({ reel: r, score: recencyBoost(r, now) + 5 });
      }
    }
  } else {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    for (const r of all) {
      const cap = r.caption.toLowerCase();
      let matches = 0;
      let exactTagBonus = 0;
      let captionStartsWithBonus = 0;
      for (const t of tokens) {
        if (r.hashtags.includes(t)) {
          matches++;
          exactTagBonus += 2;
        } else if (r.tags.includes(t)) {
          matches++;
        } else if (cap.includes(t)) {
          matches++;
          if (cap.startsWith(t)) captionStartsWithBonus += 3;
        }
      }
      if (matches > 0) {
        const score = matches + exactTagBonus + captionStartsWithBonus + recencyBoost(r, now);
        scored.push({ reel: r, score });
      }
    }
  }

  // Sort primarily by relevance score, tie-breaking by uploadedAt timestamp descending
  scored.sort((a, b) => b.score - a.score || (b.reel.uploadedAt || 0) - (a.reel.uploadedAt || 0));
  return scored.slice(0, limit);
}

/**
 * Calculates a recency score boost based on publication timestamp (uploadedAt).
 * Uses a half-life formula prioritizing recently posted content.
 */
function recencyBoost(r: Reel, now: number): number {
  if (!r.uploadedAt) return 0;
  const days = Math.max(0, (now - r.uploadedAt) / DAY_MS);
  return 3 / (1 + days / 7);
}
