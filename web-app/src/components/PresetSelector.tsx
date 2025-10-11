'use client';

import { useState } from 'react';
import { FILTER_PRESETS, FilterState } from '@/hooks/useFilterPersistence';

type PresetSelectorProps = {
  onLoadPreset: (preset: Partial<FilterState> | null) => void;
};

export function PresetSelector({ onLoadPreset }: PresetSelectorProps) {
  const presetNames = Object.keys(FILTER_PRESETS);
  const [selected, setSelected] = useState('');

  return (
    <div className="p-4 border rounded-2xl shadow-sm">
      <h3 className="font-medium mb-3">Quick Filters</h3>
      <select
        value={selected}
        onChange={(e) => {
          const value = e.target.value;
          setSelected(value);

          if (value) {
            onLoadPreset(FILTER_PRESETS[value]);
          } else {
            // Reset filters when selecting "Select a preset..."
            onLoadPreset(null);
          }
        }}
        className="w-full border rounded-xl px-3 py-2 text-sm"
      >
        <option value="">Select a preset...</option>
        {presetNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 mt-2">
        Quick access to popular filter combinations
      </p>
    </div>
  );
}
