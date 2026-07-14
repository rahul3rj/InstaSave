# InstaSave — Instagram Saved Folders Search Extension

## Goal
A Chrome extension that injects a search bar, tag strip, sync control, and settings into Instagram's saved-collections pages (`instagram.com/saved/*`). Users can index their saved reels/posts into a local IndexedDB library and search them by caption text or hashtag, with results shown in an Instagram-style 3–4 column grid.

## Confirmed Decisions
- **Stack:** Vite + `@crxjs/vite-plugin` (React 18 + TypeScript) + Tailwind CSS.
- **Injection:** Content script on `https://www.instagram.com/saved/*` using a Shadow DOM root so our styles can't clash with Instagram's.
- **Sync source:** Visit each saved post's permalink (`/reel/{id}/` or `/p/{id}/`) in hidden iframes and parse meta tags + embedded JSON for caption/uploader/hashtags.
- **Storage:** IndexedDB via Dexie, one table per folder plus a `tags` table for fast tag-strip aggregation.

## File Structure
```
InstaSave/
├── package.json
├── vite.config.ts                  # CRX plugin config
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── manifest.config.ts              # MV3 manifest
├── public/
│   └── icon-128.png
├── src/
│   ├── content/
│   │   ├── index.tsx               # Mounts <InstaSaveRoot/> on saved pages
│   │   ├── root.tsx                # Shadow-DOM React root
│   │   └── scraper.ts              # DOM/permalink scraper
│   ├── background/
│   │   └── index.ts                # Service worker: orchestrates sync, opens hidden tabs
│   ├── components/
│   │   ├── SearchBar.tsx           # Top search input + sync dropdown
│   │   ├── SyncMenu.tsx            # Auto / 30 / 50 / All
│   │   ├── TagStrip.tsx            # Horizontal scrollable tag chips
│   │   ├── ResultsGrid.tsx         # 3–4 col Instagram-style grid
│   │   ├── ReelCard.tsx            # Thumbnail + caption preview
│   │   ├── SettingsPopover.tsx     # Download JSON, future options
│   │   └── Icons.tsx
│   ├── lib/
│   │   ├── db.ts                   # Dexie schema + helpers
│   │   ├── search.ts               # Tag/hashtag/text ranking
│   │   ├── tags.ts                 # Build tag list from captions
│   │   └── sync.ts                 # Sync orchestration (called by background)
│   ├── types.ts                    # Reel, Folder, SyncOptions
│   └── styles.css                  # Tailwind entry
```

## Data Model (Dexie)

```ts
// types.ts
export interface Reel {
  id: string;             // Instagram media id
  url: string;            // /reel/{id}/ or /p/{id}/
  permalink: string;
  caption: string;
  hashtags: string[];     // parsed from caption (#Docker, #ai)
  tags: string[];         // hashtags ∪ words length >= 4 from caption
  creator: string;        // @username
  folder: string;         // folder name from saved collection
  thumbnail: string;      // CDN image URL
  uploadedAt: number;     // epoch ms — drives result ranking
  syncedAt: number;       // epoch ms
}

export interface Folder {
  name: string;           // e.g. "AI Tools", primary key
  count: number;
  lastSyncedAt: number;
}

export interface Settings {
  key: string;            // 'main'
  autoSync: boolean;
  defaultSyncRange: '30' | '50' | 'all';
}
```

Dexie tables: `folders`, `reels` (indexed on `folder`, `uploadedAt`, `hashtags` (multiEntry), `tags` (multiEntry), `caption` for full-text fallback), `settings`.

## UI Layout (matches Instagram vibe)

- **Black/white base** with **pink accent** for highlights, focus rings, active tags, and primary buttons (Tailwind: `bg-black text-white`, `text-pink-500`, `ring-pink-500`).
- **Top bar (sticky):** search input (left, flex-1) + sync button with dropdown chevron (right) + small ⚙ settings icon (far right).
- **Tag strip:** horizontal scrollable row of pill chips directly below the top bar. Tag order = frequency desc within currently-loaded folders, with recency tiebreaker.
- **Results area (only when query is non-empty):** CSS grid `grid-cols-3 md:grid-cols-4 gap-1`. Each card: square thumbnail (Instagram's 1:1 crop), bottom overlay with 2-line clamped caption. Click opens the original Instagram URL in a new tab.

## Component Behavior

### SearchBar
- Debounced 200ms input.
- On change: updates query, runs `search.reels(query)` from IndexedDB, re-renders ResultsGrid.
- Empty input → hide ResultsGrid, show original Instagram content as-is.

### TagStrip
- Computed once per folder-load via `tags.top(20)`.
- Clicking a tag calls `setQuery('#' + tag)`, same flow as typing.

### SyncMenu
- Button: `Sync ▾`
- Options: **Auto** (on every visit, debounced 5 min), **Last 30**, **Last 50**, **All**.
- "Last N" means the N most recently uploaded reels in the current folder.
- Click → message background worker → worker opens hidden tabs in sequence (max 2 concurrent), scrapes, bulk-puts into Dexie.

### SettingsPopover
- For now: **Download JSON** button. Exports current folder's reels as a `.json` file via `chrome.downloads` (or `URL.createObjectURL` blob in the content script, equally fine for MVP).

## Search & Ranking (lib/search.ts)

Algorithm:
1. Lowercase query.
2. If starts with `#`: treat as hashtag filter, match `hashtags` index.
3. Else: tokenize. For each token, match `hashtags`, `tags`, or substring in `caption`.
4. Score per reel = `relevance + recencyBoost` where
   - `relevance` = number of matched tokens + 3 if caption starts with query + 2 if any hashtag is exact match
   - `recencyBoost` = `1 / (1 + daysSinceUpload / 30)` (per your "time decides priority" rule)
5. Sort desc, paginate first 60.

Tag aggregation (`lib/tags.ts`):
- On every sync, build a `Map<tag, {count, lastSeenAt}>` from each reel's `tags` array.
- `top(n)` returns sorted by `count desc, lastSeenAt desc`.

## Sync Flow (lib/sync.ts + background/index.ts)

1. User clicks sync in the content script.
2. Content script reads current folder name from URL + DOM (`/saved/all/`, `/saved/{collection-id}/` → resolve name from the H1/header).
3. Posts a message to background: `{ type: 'SYNC', folder, mode: '30' | '50' | 'all' | 'auto' }`.
4. Background service worker:
   - Reads the saved-collection page in a hidden tab to extract permalink list (or uses the DOM data already gathered in the content script — first sync uses content script to bootstrap, then background iterates).
   - For each permalink, opens hidden tab, waits for `domcontentloaded` + 1s grace, scrapes:
     - `og:title`, `og:description` → caption
     - `og:image` → thumbnail
     - JSON in `<script type="application/ld+json">` → uploader
     - regex `/#[A-Za-z0-9_]+/g` on caption → hashtags
     - `datePublished` if present, else fallback to `syncedAt`
   - Bulk-puts into Dexie (batches of 50).
   - Closes hidden tab.
5. After sync, content script receives `{ type: 'SYNC_DONE', folder }` and refreshes tag strip.

Auto-sync: a `chrome.alarms` registration in the background re-triggers last sync on a 6-hour tick.

## Manifest (MV3 essentials)
- `permissions`: `storage`, `tabs`, `scripting`, `downloads`, `alarms`
- `host_permissions`: `https://www.instagram.com/*`
- `content_scripts`: matches `https://www.instagram.com/saved/*`, `js: ['src/content/index.tsx']`, `world: 'MAIN'` (so we can read Instagram's DOM for the bootstrap permalink list), and a separate Shadow-DOM root via the React mount.
- `web_accessible_resources`: tailwind-compiled CSS if needed.

## Build Setup
- `vite.config.ts` uses `@crxjs/vite-plugin/react` with `manifest.config.ts`.
- Tailwind v3: `tailwind.config.js` with `content: ['./src/**/*.{ts,tsx}']`, custom palette `{ black: '#000', white: '#fff', igpink: '#E1306C' }`.
- TypeScript strict mode.

## Edge Cases Handled
- Folder name is a numeric collection id initially; if H1 is missing, store the id as the folder name and let the user rename later (future feature).
- Sync interrupted (user closes tab): partial data persists, next sync diffs by `id` and updates.
- Caption has no hashtags: `hashtags = []`, `tags` still includes >=4-char words.
- Thumbnails: store CDN URL, not the bytes (keeps DB small). Instagram's CDN URLs are public; they'll work in `<img src>`.
- Hashtag normalization: lowercase, strip punctuation, dedupe.

## Out of Scope (for this iteration)
- Rename folders, merge folders, delete reels
- Cloud sync, multi-device
- AI-based caption embeddings (mentioned "Ai" as an example tag, not a feature)
- Watching sync progress in real time (just a small "Syncing…" pill in the top bar)
- Tests — defer until core flow works; suggest Vitest + Playwright after MVP

## Build Order
1. Scaffold Vite + CRX + Tailwind + TS, get a "hello" content script to mount on `/saved/`.
2. Dexie schema + types + sample seed (5 fake reels) to develop UI without scraping.
3. SearchBar + ResultsGrid + ReelCard with the seed data.
4. TagStrip + search ranking.
5. Scraping: bootstrap permalink list from saved page DOM, then background worker permalink scraper.
6. SyncMenu + settings + Download JSON.
7. Polish: pink accents, focus rings, empty states, error toasts.

## Open Question to Confirm
- The content script on `instagram.com/saved/*` requires reading Instagram's React-rendered DOM. Instagram is heavy SPA + auth-gated. If you have 2FA or rate-limit issues during testing, the alternative is to import a user-provided Instagram "Download Your Information" export (point 3 in the earlier question). I'll start with the permalink-scrape approach; switch to export-import only if scraping proves unreliable.
