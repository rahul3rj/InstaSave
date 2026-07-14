import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'InstaSave',
  version: '0.1.0',
  description: 'Search and sync your Instagram saved reels.',
  permissions: ['storage', 'tabs', 'scripting', 'downloads', 'alarms'],
  host_permissions: ['https://www.instagram.com/*'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://www.instagram.com/*'],
      js: ['src/content/index.tsx'],
      run_at: 'document_idle',
    },
  ],
  icons: {
    '128': 'icon-128.svg',
  },
});
