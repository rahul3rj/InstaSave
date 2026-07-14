import type { TagCount } from '../lib/tags';

interface Props {
  tags: TagCount[];
  onPick: (tag: string) => void;
  activeTag: string | null;
}

export function TagStrip({ tags, onPick, activeTag }: Props) {
  return (
    <div className="mt-3 -mx-1 px-1 overflow-x-auto no-scrollbar py-0.5">
      <div className="flex gap-2 items-center">
        {tags.map((t) => {
          const isActive = activeTag === t.tag;
          return (
            <button
              key={t.tag}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all whitespace-nowrap border-none select-none ${
                isActive
                  ? 'bg-white text-black font-semibold scale-[1.02]'
                  : 'bg-[#25292E] text-white hover:bg-[#32383E]'
              }`}
              onClick={() => onPick(t.tag)}
              title={`${t.count} reel${t.count === 1 ? '' : 's'}`}
            >
              <span>#{t.tag}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-black/15 text-black font-bold' : 'bg-black/30 text-gray-400'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
