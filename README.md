# InstaSave

A Chrome extension (MV3) that injects a search bar, tag strip, and sync control into Instagram's saved-collections pages. Indexes your saved reels/posts into a local IndexedDB library and lets you search them by caption text or hashtag.

## Stack
- Vite + `@crxjs/vite-plugin` (MV3)
- React 18 + TypeScript
- Tailwind CSS (black/white with pink accents, matching Instagram vibe)
- Dexie (IndexedDB wrapper)

## Develop
```bash
npm install
npm run dev
```
Then load `dist/` as an unpacked extension in `chrome://extensions`.

## Layout
- `src/content/` — content script that mounts a Shadow-DOM React root on `instagram.com/saved/*`
- `src/background/` — service worker that scrapes individual reels in hidden tabs
- `src/components/` — SearchBar, SyncMenu, TagStrip, ResultsGrid, ReelCard, SettingsPopover
- `src/lib/` — `db.ts` (Dexie), `search.ts` (ranking), `tags.ts` (tag aggregation), `sync.ts` (sync orchestration)
- `src/types.ts` — `Reel`, `Folder`, `Settings` types

## Notes
- Replace `public/icon-128.svg` with a real PNG if you want (manifest currently points to the SVG; Chrome MV3 supports it).
- Instagram may rate-limit permalink scraping. If sync feels slow or fails, switch to importing a user-provided Instagram "Download Your Information" export — that adapter is the next thing to build.
