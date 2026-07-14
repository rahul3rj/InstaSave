import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { Root as InstaSaveRoot } from './root';
import { detectFolderFromUrl } from './folder';
import { scrapeSavedPageDom } from './scraper';
import styles from '../styles.css?inline';

const HOST_ID = 'instasave-host';
const MOUNT_ID = 'instasave-mount';

let reactRoot: Root | null = null;
let retryTimer: number | null = null;

function tryMount() {
  if (retryTimer) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }

  // Only mount on Instagram /saved/ pages (e.g. /username/saved/* or /saved/*)
  if (!location.pathname.includes('/saved')) {
    unmount();
    return;
  }

  if (document.getElementById(HOST_ID)) return;

  const mainContainer = document.querySelector('section main') || document.querySelector('main') || document.body;
  if (!mainContainer) {
    retryTimer = window.setTimeout(tryMount, 300);
    return;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.width = '100%';
  host.style.maxWidth = '935px';
  host.style.margin = '0 auto';
  host.style.position = 'relative';
  host.style.zIndex = '99';
  host.style.pointerEvents = 'none';

  // Insert at top of main saved container
  if (mainContainer.firstChild) {
    mainContainer.insertBefore(host, mainContainer.firstChild);
  } else {
    mainContainer.appendChild(host);
  }

  const shadow = host.attachShadow({ mode: 'open' });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(styles);
  shadow.adoptedStyleSheets = [sheet];

  const mountEl = document.createElement('div');
  mountEl.id = MOUNT_ID;
  mountEl.style.pointerEvents = 'auto';
  shadow.appendChild(mountEl);

  reactRoot = createRoot(mountEl);
  reactRoot.render(createElement(InstaSaveRoot, { shadow, folder: detectFolderFromUrl() }));
}

function unmount() {
  if (retryTimer) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
  reactRoot?.unmount();
  reactRoot = null;
  document.getElementById(HOST_ID)?.remove();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryMount, { once: true });
} else {
  tryMount();
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'SCRAPE_DOM_ANCHORS') {
    const anchors = scrapeSavedPageDom();
    sendResponse({ anchors });
    return true;
  }
});

// React to Instagram's SPA URL changes
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    unmount();
    tryMount();
  }
});

observer.observe(document.body || document.documentElement, { subtree: true, childList: true });
