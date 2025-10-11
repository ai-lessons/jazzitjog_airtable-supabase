'use client';

import { useEffect, useState } from 'react';

const BRAND_HISTORY_KEY = 'brand_search_history';
const MAX_HISTORY = 5;

export function useBrandHistory() {
  const [history, setHistory] = useState<string[]>([]);

  // Load history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BRAND_HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load brand history:', error);
    }
  }, []);

  // Add brand to history
  const addToHistory = (brandName: string) => {
    setHistory(prev => {
      // Remove brand if it exists (we'll add it to the front)
      const filtered = prev.filter(b => b !== brandName);
      // Add to front and limit to MAX_HISTORY
      const updated = [brandName, ...filtered].slice(0, MAX_HISTORY);

      // Save to localStorage
      try {
        localStorage.setItem(BRAND_HISTORY_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save brand history:', error);
      }

      return updated;
    });
  };

  return { history, addToHistory };
}
