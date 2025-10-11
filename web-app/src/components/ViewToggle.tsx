type ViewMode = 'table' | 'cards';

type ViewToggleProps = {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
};

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex border rounded-lg overflow-hidden">
      <button
        onClick={() => onChange('table')}
        className={`px-4 py-2 text-sm font-medium transition ${
          mode === 'table'
            ? 'bg-black text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="3" width="12" height="2" />
            <rect x="2" y="7" width="12" height="2" />
            <rect x="2" y="11" width="12" height="2" />
          </svg>
          Table
        </span>
      </button>
      <button
        onClick={() => onChange('cards')}
        className={`px-4 py-2 text-sm font-medium transition ${
          mode === 'cards'
            ? 'bg-black text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="2" width="5" height="5" />
            <rect x="9" y="2" width="5" height="5" />
            <rect x="2" y="9" width="5" height="5" />
            <rect x="9" y="9" width="5" height="5" />
          </svg>
          Cards
        </span>
      </button>
    </div>
  );
}
