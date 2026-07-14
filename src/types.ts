// Shared types used by content, background, and UI.

export interface Reel {
  id: string;
  url: string;
  permalink: string;
  caption: string;
  hashtags: string[];
  tags: string[];
  creator: string;
  folder: string;
  thumbnail: string;
  uploadedAt: number;
  syncedAt: number;
}

export interface Folder {
  name: string;
  count: number;
  lastSyncedAt: number;
}

export interface Settings {
  key: 'main';
  autoSync: boolean;
  defaultSyncRange: SyncRange;
}

export type SyncRange = 'auto' | '30' | '50' | 'all';

export interface SyncRequest {
  type: 'SYNC';
  folder: string;
  mode: SyncRange;
}

export interface SyncProgress {
  type: 'SYNC_PROGRESS';
  folder: string;
  done: number;
  total: number;
}

export interface SyncDone {
  type: 'SYNC_DONE';
  folder: string;
  added: number;
  updated: number;
}

export interface SyncError {
  type: 'SYNC_ERROR';
  folder: string;
  message: string;
}

export type BgMessage = SyncRequest;
export type CsMessage = SyncProgress | SyncDone | SyncError;
