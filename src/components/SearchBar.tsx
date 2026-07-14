import { SearchIcon, CloseIcon } from './Icons';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder, className }: Props) {
  return (
    <div className={`relative flex items-center ${className ?? ''}`}>
      <span className="absolute left-4 text-[#8e8e8e] pointer-events-none">
        <SearchIcon className="w-4 h-4 text-[#8e8e8e]" />
      </span>
      <input
        type="text"
        className="w-full h-10 bg-[#25292E] text-white placeholder-[#8e8e8e] rounded-full pl-11 pr-10 text-sm outline-none border-none transition-all font-normal leading-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search'}
        spellCheck={false}
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3.5 p-0.5 text-gray-300 hover:text-white bg-[#343a40] rounded-full transition cursor-pointer"
          title="Clear search"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
