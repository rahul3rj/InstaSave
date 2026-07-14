import type { Reel } from '../types';

export interface TagCount {
  tag: string;
  count: number;
  lastSeenAt: number;
}

/**
 * Aggregate tags from a list of reels. Sort: count desc, then lastSeenAt desc.
 */
export function aggregateTags(reels: Reel[], limit = 20): TagCount[] {
  const map = new Map<string, TagCount>();
  for (const r of reels) {
    const recency = r.uploadedAt || r.syncedAt || 0;
    for (const t of r.tags) {
      const cur = map.get(t);
      if (cur) {
        cur.count++;
        if (recency > cur.lastSeenAt) cur.lastSeenAt = recency;
      } else {
        map.set(t, { tag: t, count: 1, lastSeenAt: recency });
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count || b.lastSeenAt - a.lastSeenAt)
    .slice(0, limit);
}
