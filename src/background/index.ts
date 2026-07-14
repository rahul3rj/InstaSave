// Background service worker for handling cross-origin network requests (e.g. metadata fetching)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'FETCH_PERMALINK_META') {
    fetchPermalinkMetadata(msg.permalink)
      .then((meta) => sendResponse(meta))
      .catch(() => sendResponse({}));
    return true; // async response
  }
});

// Setup auto-sync alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'instasave-autosync') {
    console.log('[InstaSave Background] Scheduled auto-sync triggered');
    const tabs = await chrome.tabs.query({ url: 'https://www.instagram.com/*' });
    tabs.forEach((tab) => {
      if (tab.id && tab.url?.includes('/saved')) {
        chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AUTO_SYNC' }).catch(() => {});
      }
    });
  }
});

// Create alarm interval on startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('instasave-autosync', { periodInMinutes: 360 }); // 6 hours
});

async function fetchPermalinkMetadata(permalink: string) {
  try {
    const res = await fetch(permalink, { headers: { 'Accept-Language': 'en-US,en;q=0.9' } });
    if (res.status === 429) {
      return { rateLimited: true };
    }
    if (!res.ok) return {};

    const html = await res.text();

    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)?.[1] || '';
    const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)?.[1] || '';
    const ogImg = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i)?.[1] || '';

    // Extract creator handle from ogTitle (e.g. "Name (@handle) on Instagram...")
    const handleMatch = ogTitle.match(/@([A-Za-z0-9_.]+)/);
    const creator = handleMatch ? handleMatch[1] : '';

    // Extract publication time from HTML metadata or <time> tag
    const timeMatch =
      html.match(/<time[^>]+datetime="([^"]+)"/i)?.[1] ||
      html.match(/"datePublished":\s*"([^"]+)"/i)?.[1] ||
      html.match(/"uploadDate":\s*"([^"]+)"/i)?.[1] ||
      html.match(/<meta\s+property="article:published_time"\s+content="([^"]*)"/i)?.[1];

    let uploadedAt: number | undefined;
    if (timeMatch) {
      const parsed = Date.parse(timeMatch);
      if (!isNaN(parsed) && parsed > 0) uploadedAt = parsed;
    }

    return {
      caption: ogDesc || ogTitle,
      thumbnail: ogImg.replace(/&amp;/g, '&').trim(),
      creator,
      ...(uploadedAt ? { uploadedAt } : {}),
    };
  } catch {
    return {};
  }
}
