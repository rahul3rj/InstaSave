import type { Reel, SyncRange } from '../types';
import { extractHashtags, extractTags, unescapeHtml, extractCreatorFromAlt } from '../lib/extract';

export interface ScrapedAnchor {
  id: string;
  url: string;
  permalink: string;
  thumbnail: string;
  caption: string;
  creator: string;
  uploadedAt?: number;
}

/**
 * Safely extracts high-res image or video poster URLs from Instagram DOM elements
 * without truncating query parameters or breaking HMAC signature hashes.
 */
export function extractThumbnailUrl(a: HTMLAnchorElement): string {
  const parentContainer = a.closest('div') || a;

  // 1. Video poster check
  const video = a.querySelector<HTMLVideoElement>('video') || parentContainer.querySelector<HTMLVideoElement>('video');
  if (video?.poster && !video.poster.includes('data:')) {
    return video.poster.replace(/&amp;/g, '&');
  }

  // 2. Image element check - query images inside container and filter out play icons
  const imgs = Array.from(parentContainer.querySelectorAll<HTMLImageElement>('img'));
  const mediaImg =
    imgs.find((img) => {
      const src = img.currentSrc || img.src || '';
      const alt = img.alt || '';
      if (src.includes('play') || src.includes('icon') || src.includes('sprite')) return false;
      return src.includes('cdninstagram') || src.includes('fbcdn') || src.includes('scontent') || img.srcset || alt.length > 5;
    }) || imgs[0];

  if (!mediaImg) return '';

  let rawUrl = mediaImg.currentSrc || mediaImg.src || '';

  // Parse srcset properly if currentSrc is missing or data URL
  if ((!rawUrl || rawUrl.startsWith('data:')) && mediaImg.srcset) {
    const matches = mediaImg.srcset.match(/https?:\/\/[^\s,]+/g);
    if (matches && matches.length > 0) {
      rawUrl = matches[matches.length - 1];
    }
  }

  return rawUrl.replace(/&amp;/g, '&').trim();
}

/**
 * Extracts publication date from <time datetime="..."> in Instagram DOM
 */
export function extractUploadTimestamp(a: HTMLAnchorElement): number {
  const parentContainer = a.closest('div') || a;
  const timeEl = a.querySelector<HTMLTimeElement>('time') || parentContainer.querySelector<HTMLTimeElement>('time');
  if (timeEl) {
    const dt = timeEl.getAttribute('datetime');
    if (dt) {
      const parsed = Date.parse(dt);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 0;
}

/**
 * Scrapes visible saved post/reel cards from Instagram's current DOM grid.
 */
export function scrapeSavedPageDom(): ScrapedAnchor[] {
  const anchors = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"]'
  );

  const map = new Map<string, ScrapedAnchor>();

  anchors.forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;

    // Extract shortcode id
    const match = href.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
    if (!match) return;

    const id = match[1];
    if (map.has(id)) return;

    // Clean standard permalink URL structure
    const cleanPath = `/p/${id}/`;
    const permalink = `https://www.instagram.com/p/${id}/`;

    // Extract thumbnail & upload timestamp
    const thumbnail = extractThumbnailUrl(a);
    const uploadedAt = extractUploadTimestamp(a);

    // Caption & creator from alt attribute
    const img = a.querySelector<HTMLImageElement>('img') || a.closest('div')?.querySelector<HTMLImageElement>('img');
    const rawAlt = img?.alt || '';
    const creator = extractCreatorFromAlt(rawAlt);
    const caption = unescapeHtml(rawAlt);

    map.set(id, {
      id,
      url: cleanPath,
      permalink,
      thumbnail,
      caption,
      creator,
      uploadedAt: uploadedAt || undefined,
    });
  });

  return Array.from(map.values());
}

/**
 * Auto-scrolls Instagram page to load and collect posts for "Sync All" or target limit.
 */
export async function scrapeAllSavedAnchors(
  mode: SyncRange,
  onProgress?: (count: number) => void
): Promise<ScrapedAnchor[]> {
  const initialScrollY = window.scrollY;
  const targetLimit = mode === '30' ? 30 : mode === '50' ? 50 : 9999;

  const collectedMap = new Map<string, ScrapedAnchor>();

  const gather = () => {
    const current = scrapeSavedPageDom();
    current.forEach((item) => collectedMap.set(item.id, item));
    onProgress?.(collectedMap.size);
  };

  gather();

  let noNewCount = 0;
  let lastSize = collectedMap.size;

  while (collectedMap.size < targetLimit && noNewCount < 3) {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await new Promise((resolve) => setTimeout(resolve, 750));

    gather();

    if (collectedMap.size === lastSize) {
      noNewCount++;
    } else {
      noNewCount = 0;
      lastSize = collectedMap.size;
    }
  }

  window.scrollTo({ top: initialScrollY, behavior: 'smooth' });

  const allAnchors = Array.from(collectedMap.values());
  return targetLimit < 9999 ? allAnchors.slice(0, targetLimit) : allAnchors;
}

/**
 * Converts scraped anchors into Reel format with upload timestamp.
 */
export function convertAnchorsToReels(anchors: ScrapedAnchor[], folder: string): Reel[] {
  const now = Date.now();
  return anchors.map((a) => {
    const caption = unescapeHtml(a.caption);
    return {
      id: a.id,
      url: a.url,
      permalink: a.permalink,
      caption,
      hashtags: extractHashtags(caption),
      tags: extractTags(caption),
      creator: a.creator,
      folder,
      thumbnail: a.thumbnail,
      uploadedAt: a.uploadedAt || now,
      syncedAt: now,
    };
  });
}
