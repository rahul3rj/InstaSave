# 📸 InstaSave — Local Search & Auto-Sync for Instagram Saved Collections

<p align="center">
  <b>Search, Tag & Organize your Instagram Saved Reels natively inside Instagram Web.</b><br>
  <i>100% Privacy-First • IndexedDB Powered • Blends Seamlessly into Instagram Native Dark UI</i>
</p>

---

## ✨ Features

- 🔍 **Native Search Bar**: Search any saved folder or collection instantly by caption keywords, creators, or hashtags right at the top of your Instagram Saved page.
- 🎨 **100% Instagram Native UI Blend**: Pixel-perfect integration into Instagram Web's layout (`#25292E` dark theme, pill inputs, borderless 3-column Reels grid, zero UI overlap).
- 🏷️ **Intelligent Noun Tag Strips**: Automatically extracts clean, meaningful topic nouns and hashtags from captions (filtering out English filler/grammar words) into clickable pill chips.
- ⚡ **Recency-Ranked Search**: Prioritizes newly published reels (`uploadedAt` timestamp decay) with human-readable relative date badges (`2d ago`, `1w ago`).
- 🔒 **100% Local & Private**: All synced data stays inside your browser's local IndexedDB instance using Dexie.js. No tracking, no external database servers.
- 🛡️ **HTTP 429 Anti-Ban Protection**: Smart client-side DOM scraper and 1500ms request throttling prevent Instagram rate limiting.
- 📁 **JSON Data Export**: Backup your saved reel collections to a structured `.json` file at any time.

---

## 🚀 Tech Stack

- **Framework**: [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/) + [`@crxjs/vite-plugin`](https://crxjs.dev/vite-plugin) (Manifest V3)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Vanilla CSS tokens inside Shadow DOM)
- **Local Storage**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)

---

## 🛠️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rahul3rj/InstaSave.git
   cd InstaSave
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build production extension bundle**:
   ```bash
   npm run build
   ```

4. **Load into Google Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right corner).
   - Click **Load unpacked** and select the `dist/` directory inside the project folder.
   - Open any Instagram Saved Collection URL (`https://www.instagram.com/your_username/saved/`) and enjoy! 🎉

---

## 🧩 Extension Architecture

```
InstaSave/
├── manifest.config.ts    # Chrome Extension Manifest V3 configuration
├── src/
│   ├── background/       # Service Worker for alarms & cross-origin metadata fetching
│   ├── components/       # Monochromatic Instagram-style UI Components
│   │   ├── SearchBar.tsx       # Pill search input clone
│   │   ├── SyncMenu.tsx        # Range sync menu (30, 50, All)
│   │   ├── TagStrip.tsx        # Interactive noun tag chips
│   │   ├── ResultsGrid.tsx     # 3-column Reels grid container
│   │   ├── ReelCard.tsx        # Sharp 4:5 portrait card with hover caption overlay
│   │   └── SettingsPopover.tsx # InstaSave popover, JSON export & GitHub CTA
│   ├── content/          # Content Scripts & DOM Scraper
│   │   ├── index.tsx           # Shadow DOM root mount & SPA route observer
│   │   ├── root.tsx            # Main React UI container
│   │   ├── scraper.ts          # Infinite scroll scraper & CDN thumbnail extractor
│   │   └── folder.ts           # Saved collection slug parser
│   ├── lib/              # Core Logic & Utilities
│   │   ├── db.ts               # Dexie IndexedDB models
│   │   ├── search.ts           # Relevance & recency scoring engine
│   │   ├── sync.ts             # Throttled sync orchestrator
│   │   ├── tags.ts             # Noun aggregation engine
│   │   └── extract.ts          # Stopword filter & HTML unescaper
│   ├── styles.css        # Tailwind utilities & custom scrollbar rules
│   └── types.ts          # TypeScript domain interfaces
```

---

## ⚙️ How Sync & Search Works

1. **DOM Scraper**: When you click **Sync**, InstaSave smoothly auto-scrolls through your saved folder to collect shortcode links, post handles, upload timestamps, and direct CDN thumbnail URLs.
2. **IndexedDB Write**: All records are written directly into IndexedDB under the `https://www.instagram.com` domain origin so data is instantly available across profile pages.
3. **Smart Search**: When you type into the search bar, InstaSave evaluates caption tokens against hashtags and tags, boosting results based on recency and exact hashtag matches.

---

## ⭐ Support & Feedback

If you find **InstaSave** helpful, please give it a **⭐ Star** on [GitHub](https://github.com/rahul3rj/InstaSave)!

---

<p align="center">
  Crafted with ❤️ by Rahul Jha
</p>
