'use client';

import { useEffect } from 'react';

export type FilterState = {
  q: string;
  surface: string[];
  use: string[];
  cushioning: string[];
  width: string[];
  breathability: string[];
  brands: string[];
  plate: string;
  waterproof: string;
  priceRange: [number, number];
  weightRange: [number, number];
  dropRange: [number, number];
  sort: string;
};

const STORAGE_KEY = 'shoe_search_filters';

export function useFilterPersistence(filters: FilterState) {
  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Failed to save filters:', error);
    }
  }, [filters]);

  // Load filters from localStorage
  const loadSavedFilters = (): Partial<FilterState> | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
    return null;
  };

  return { loadSavedFilters };
}

// Presets
export const FILTER_PRESETS: Record<string, Partial<FilterState>> = {
  'Racing Shoes': {
    use: ['racing'],
    plate: 'with',
    weightRange: [180, 250],
    sort: 'weight_asc',
  },
  'Trail Running': {
    surface: ['trail'],
    sort: 'price_asc',
  },
  'Budget Friendly': {
    priceRange: [50, 120],
    sort: 'price_asc',
  },
  'Max Cushion': {
    cushioning: ['max'],
    dropRange: [6, 12],
    sort: 'price_asc',
  },
  'Daily Trainers': {
    use: ['daily trainer'],
    surface: ['road'],
    priceRange: [100, 180],
    sort: 'price_asc',
  },
};
