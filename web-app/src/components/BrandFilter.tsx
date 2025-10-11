'use client';

import { useState } from 'react';

type BrandFilterProps = {
  brands: Array<{ name: string; count: number }>;
  selectedBrands: Set<string>;
  onChange: (brands: Set<string>) => void;
  recentBrands?: string[];
  onBrandClick?: (brandName: string) => void;
};

export function BrandFilter({
  brands,
  selectedBrands,
  onChange,
  recentBrands = [],
  onBrandClick
}: BrandFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const maxVisible = 5;

  // When collapsed: show recent brands (max 5 unique)
  // When expanded: show all brands alphabetically
  const visibleBrands = expanded
    ? brands
    : brands.filter(b => recentBrands.includes(b.name)).slice(0, maxVisible);

  const toggleBrand = (brandName: string) => {
    const next = new Set(selectedBrands);
    if (next.has(brandName)) {
      next.delete(brandName);
    } else {
      next.add(brandName);
      // Track brand click for history
      if (onBrandClick) {
        onBrandClick(brandName);
      }
    }
    onChange(next);
  };

  return (
    <div className="p-4 border rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Brands</h3>
        {selectedBrands.size > 0 && (
          <button
            onClick={() => onChange(new Set())}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear ({selectedBrands.size})
          </button>
        )}
      </div>

      <div className="space-y-2">
        {visibleBrands.map((brand) => (
          <label
            key={brand.name}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition"
          >
            <input
              type="checkbox"
              checked={selectedBrands.has(brand.name)}
              onChange={() => toggleBrand(brand.name)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="flex-1 text-sm">{brand.name}</span>
            <span className="text-xs text-gray-400">({brand.count})</span>
          </label>
        ))}
      </div>

      {brands.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-2 text-sm text-gray-600 hover:text-gray-900 underline"
        >
          {expanded ? 'Show less' : `Show all brands`}
        </button>
      )}
    </div>
  );
}
