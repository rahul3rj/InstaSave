import Dexie, { type Table } from 'dexie';
import type { Folder, Reel, Settings } from '../types';

export class InstaSaveDB extends Dexie {
  folders!: Table<Folder, string>;
  reels!: Table<Reel, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('instasave');
    this.version(1).stores({
      // multiEntry indexes so hashtag/tag queries are O(matches), not O(n)
      folders: 'name, lastSyncedAt',
      reels: 'id, folder, uploadedAt, syncedAt, *hashtags, *tags',
      settings: 'key',
    });
  }
}

export const db = new InstaSaveDB();

export const DEFAULT_SETTINGS: Settings = {
  key: 'main',
  autoSync: false,
  defaultSyncRange: '30',
};

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get('main');
  if (existing) return existing;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function putSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, ...patch, key: 'main' };
  await db.settings.put(next);
  return next;
}

export async function upsertReels(reels: Reel[]): Promise<{ added: number; updated: number }> {
  if (!reels.length) return { added: 0, updated: 0 };
  const ids = reels.map((r) => r.id);
  const existing = await db.reels.bulkGet(ids);
  const toPut: Reel[] = [];
  let added = 0;
  let updated = 0;
  for (let i = 0; i < reels.length; i++) {
    const r = reels[i];
    if (existing[i]) updated++;
    else added++;
    toPut.push(r);
  }
  await db.reels.bulkPut(toPut);
  return { added, updated };
}

export async function upsertFolder(name: string): Promise<void> {
  const existing = await db.folders.get(name);
  const count = await db.reels.where('folder').equals(name).count();
  await db.folders.put({
    name,
    count,
    lastSyncedAt: existing?.lastSyncedAt ?? 0,
  });
}

export async function bumpFolderSync(name: string, delta: number): Promise<void> {
  const existing = await db.folders.get(name);
  await db.folders.put({
    name,
    count: (existing?.count ?? 0) + delta,
    lastSyncedAt: Date.now(),
  });
}
