import { useState } from 'react';
import type { Reel } from '../types';
import { BookmarkIcon } from './Icons';
import { unescapeHtml } from '../lib/extract';

interface Props {
  reel: Reel;
}

export function formatRelativeTime(ts?: number): string {
  if (!ts) return '';
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ReelCard({ reel }: Props) {
  const [imgError, setImgError] = useState(false);
  const cleanCaption = unescapeHtml(reel.caption);
  const cleanCreator = reel.creator ? reel.creator.replace(/^@/, '') : '';
  const timeFormatted = formatRelativeTime(reel.uploadedAt);

  return (
    <a
      href={reel.permalink || `https://www.instagram.com${reel.url}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-[4/5] overflow-hidden rounded-none bg-[#121212] focus:outline-none transition-all cursor-pointer select-none"
    >
      {reel.thumbnail && !imgError ? (
        <img
          src={reel.thumbnail}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full flex-col justify-between p-3.5 bg-[#181818] text-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-300 tracking-wider truncate">
              {cleanCreator ? `@${cleanCreator}` : 'Reel'}
            </span>
            <BookmarkIcon className="w-3.5 h-3.5 text-gray-400" />
          </div>

          <p className="line-clamp-3 text-xs leading-relaxed text-white/90 font-medium">
            {cleanCaption || 'Saved Reel'}
          </p>

          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-white/10">
            <span>{timeFormatted || 'View Reel'}</span>
            <span className="text-white font-semibold">↗</span>
          </div>
        </div>
      )}

      {/* Pop-up Bottom Hover Overlay (2-line clamped caption + relative upload time) */}
      {reel.thumbnail && !imgError && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 text-left translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out z-20 pointer-events-none">
          <div className="flex items-center justify-between gap-2 mb-1">
            {cleanCreator && (
              <span className="text-[11px] font-bold text-gray-200 truncate">
                @{cleanCreator}
              </span>
            )}
            {timeFormatted && (
              <span className="text-[10px] font-medium text-gray-400 shrink-0">
                {timeFormatted}
              </span>
            )}
          </div>
          {cleanCaption && (
            <p className="line-clamp-2 text-xs text-white/95 leading-snug font-normal">
              {cleanCaption}
            </p>
          )}
        </div>
      )}
    </a>
  );
}
