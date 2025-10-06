// Extract module unit tests

import { describe, it, expect } from 'vitest';
import { analyzeTitleForContext, matchesTitleAnalysis } from '../../../src/etl/extract/title_analysis';
import type { TitleAnalysis } from '../../../src/llm/types';

describe('Title Analysis', () => {
  describe('analyzeTitleForContext', () => {
    it('should detect specific model in title', () => {
      const result = analyzeTitleForContext('Nike Vaporfly 3 Review');

      expect(result.scenario).toBe('specific');
      expect(result.brand).toBe('Nike');
      expect(result.model).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect general comparison title', () => {
      const result = analyzeTitleForContext('Best Running Shoes 2024');

      expect(result.scenario).toBe('general');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect brand-only title', () => {
      const result = analyzeTitleForContext('Adidas Running Shoes Overview');

      expect(result.scenario).toBe('brand-only');
      expect(result.brand).toBe('Adidas');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle Hoka specific model', () => {
      const result = analyzeTitleForContext('Hoka Speedgoat 5 Trail Review');

      expect(result.scenario).toBe('specific');
      expect(result.brand).toBe('Hoka');
      expect(result.model).toBeDefined();
    });

    it('should default to general for ambiguous titles', () => {
      const result = analyzeTitleForContext('Trail Running Tips');

      expect(result.scenario).toBe('general');
    });
  });

  describe('matchesTitleAnalysis', () => {
    it('should match sneaker in general scenario', () => {
      const analysis: TitleAnalysis = {
        scenario: 'general',
        confidence: 0.8,
      };

      const sneaker = {
        brand_name: 'Nike',
        model: 'Vaporfly 3',
      };

      expect(matchesTitleAnalysis(sneaker, analysis)).toBe(true);
    });

    it('should match sneaker in specific scenario', () => {
      const analysis: TitleAnalysis = {
        scenario: 'specific',
        brand: 'Nike',
        model: 'Vaporfly 3',
        confidence: 0.9,
      };

      const sneaker = {
        brand_name: 'Nike',
        model: 'Vaporfly 3',
      };

      expect(matchesTitleAnalysis(sneaker, analysis)).toBe(true);
    });

    it('should reject sneaker not matching specific scenario', () => {
      const analysis: TitleAnalysis = {
        scenario: 'specific',
        brand: 'Nike',
        model: 'Vaporfly 3',
        confidence: 0.9,
      };

      const sneaker = {
        brand_name: 'Adidas',
        model: 'Adizero Pro 3',
      };

      expect(matchesTitleAnalysis(sneaker, analysis)).toBe(false);
    });

    it('should match sneaker in brand-only scenario', () => {
      const analysis: TitleAnalysis = {
        scenario: 'brand-only',
        brand: 'Nike',
        confidence: 0.85,
      };

      const sneaker1 = {
        brand_name: 'Nike',
        model: 'Vaporfly 3',
      };

      const sneaker2 = {
        brand_name: 'Adidas',
        model: 'Adizero Pro 3',
      };

      expect(matchesTitleAnalysis(sneaker1, analysis)).toBe(true);
      expect(matchesTitleAnalysis(sneaker2, analysis)).toBe(false);
    });
  });
});
