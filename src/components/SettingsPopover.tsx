import { useEffect, useRef, useState } from 'react';
import type { Settings } from '../types';
import { db, putSettings } from '../lib/db';
import { GearIcon, DownloadIcon, BookmarkIcon } from './Icons';

interface Props {
  folder: string;
  settings: Settings | null;
  onChange: (settings: Settings) => void;
}

export function SettingsPopover({ folder, settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [reelCount, setReelCount] = useState<number>(0);
  const ref = useRef<HTMLDivElement>(null);

  // Shadow DOM friendly click listener using e.composedPath()
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !e.composedPath().includes(ref.current)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', onDocClick);
    return () => window.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (open) {
      db.reels.where('folder').equals(folder).count().then(setReelCount);
    }
  }, [open, folder]);

  const handleExportJson = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const reels = await db.reels.where('folder').equals(folder).toArray();
    const jsonStr = JSON.stringify(reels, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `instasave-${folder.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const toggleAutoSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!settings) return;
    const next = await putSettings({ autoSync: !settings.autoSync });
    onChange(next);
  };

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer outline-none rounded-full hover:bg-white/10"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Settings"
      >
        <GearIcon className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-[#25292E] border border-[#383E45] rounded-2xl shadow-2xl shadow-black/90 z-[100] p-2.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-white">
          {/* Header Branding with Instagram Signature Gradient */}
          <div className="px-3 py-1.5 text-xs border-b border-[#383E45] mb-2 flex items-center justify-between">
            <span className="text-sm font-black tracking-wider bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] bg-clip-text text-transparent">
              InstaSave
            </span>
            <span className="text-[10px] text-gray-400 font-mono">v0.1.0</span>
          </div>

          {/* Local Stats Badge */}
          <div className="mx-1 mb-2 px-3 py-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-gray-400 text-xs">
              <BookmarkIcon className="w-3.5 h-3.5 text-white" /> Saved Library
            </span>
            <span className="font-semibold text-white text-xs">{reelCount} reels</span>
          </div>

          <div className="space-y-0.5">
            {/* Auto Sync Toggle */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/10 rounded-xl transition cursor-pointer text-xs"
              onClick={toggleAutoSync}
            >
              <div>
                <div className="font-medium text-white text-xs">Auto Sync (6h)</div>
                <div className="text-[10px] text-gray-400">Background indexing</div>
              </div>
              <span
                className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                  settings?.autoSync ? 'bg-white justify-end' : 'bg-black/40 justify-start'
                }`}
              >
                <span className={`w-3 h-3 rounded-full shadow-md transition-transform ${settings?.autoSync ? 'bg-black' : 'bg-gray-400'}`} />
              </span>
            </button>

            {/* Export JSON Button */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/10 rounded-xl transition text-xs font-medium text-white cursor-pointer"
              onClick={handleExportJson}
            >
              <span className="flex items-center gap-2">
                <DownloadIcon className="w-3.5 h-3.5 text-gray-300" /> Export Folder JSON
              </span>
            </button>

            {/* GitHub Star CTA Section */}
            <div className="pt-2.5 mt-2 border-t border-[#383E45] px-1">
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 tracking-wider">
                Enjoying InstaSave?
              </div>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-[#F58529]/15 via-[#DD2A7B]/15 to-[#8134AF]/15 border border-[#DD2A7B]/30 hover:border-[#DD2A7B] transition text-xs font-semibold text-white group cursor-pointer"
              >
                <span className="flex items-center gap-1.5">⭐ Give a Star on GitHub</span>
                <span className="text-[10px] text-gray-400 group-hover:text-white">↗</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
