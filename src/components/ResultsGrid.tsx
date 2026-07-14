import type { Reel } from '../types';
import { ReelCard } from './ReelCard';
import { SearchIcon } from './Icons';

interface Props {
  reels: Reel[];
}

export function ResultsGrid({ reels }: Props) {
  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-transparent my-2">
        <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center text-gray-400 mb-3">
          <SearchIcon className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">No results found</h3>
        <p className="text-xs text-gray-400 max-w-xs">
          Try searching another word or hashtag, or click <span className="text-white font-semibold">Sync</span> to index your collection.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 py-1">
      {reels.map((reel) => (
        <ReelCard key={reel.id || reel.url} reel={reel} />
      ))}
    </div>
  );
}
