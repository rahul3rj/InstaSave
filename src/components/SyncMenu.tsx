import { useEffect, useRef, useState } from 'react';
import type { SyncRange } from '../types';
import { ChevronDown, SpinnerIcon, CheckIcon, SyncIcon } from './Icons';

interface Props {
  syncing: { done: number; total: number } | null;
  onSync: (mode: SyncRange) => void;
  defaultRange: SyncRange;
}

const OPTIONS: { label: string; value: SyncRange; desc: string }[] = [
  { label: 'Auto (6h)', value: 'auto', desc: 'Background periodic sync' },
  { label: 'Last 30', value: '30', desc: 'Sync 30 recent saved items' },
  { label: 'Last 50', value: '50', desc: 'Sync 50 recent saved items' },
  { label: 'Sync All', value: 'all', desc: 'Sync entire folder library' },
];

export function SyncMenu({ syncing, onSync, defaultRange }: Props) {
  const [open, setOpen] = useState(false);
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

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        className="h-10 bg-[#25292E] hover:bg-[#32383E] active:scale-[0.98] transition-all text-white font-medium text-xs tracking-wide px-4 rounded-full flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer outline-none border-none select-none shadow-sm leading-none"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        disabled={!!syncing}
        type="button"
      >
        {syncing ? (
          <>
            <SpinnerIcon className="w-3.5 h-3.5 text-white" />
            <span>Syncing {syncing.total > 0 ? `${syncing.done}/${syncing.total}` : `${syncing.done}...`}</span>
          </>
        ) : (
          <>
            <SyncIcon className="w-3.5 h-3.5 text-gray-300" />
            <span>Sync</span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-[#25292E] border border-[#383E45] rounded-2xl shadow-2xl shadow-black/80 z-[100] p-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#383E45] mb-1 flex items-center justify-between">
            <span>Sync Range</span>
          </div>

          <div className="space-y-0.5">
            {OPTIONS.map((o) => {
              const isDefault = o.value === defaultRange;
              return (
                <button
                  key={o.value}
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-xl transition-colors text-xs cursor-pointer ${
                    isDefault
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSync(o.value);
                    setOpen(false);
                  }}
                >
                  <div>
                    <div className="font-medium text-xs leading-none mb-1">{o.label}</div>
                    <div className="text-[10px] text-gray-400">{o.desc}</div>
                  </div>
                  {isDefault && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
