// src/tests/deduplication.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  generateSourceId,
  generateModelKey,
  mergeShoeResults,
  isPayloadRicher,
  deduplicateInDocument
} from '../utils/deduplication';
import { ShoeResult } from '../db/upsertResults';

describe('Deduplication Utils', () => {
  describe('generateSourceId', () => {
    it('should use article_id when available', () => {
      const sourceId = generateSourceId('article123', 'https://example.com', 'content');
      expect(sourceId).toBe('article123');
    });

    it('should use normalized source_link when article_id is empty', () => {
      const sourceId = generateSourceId('', 'https://www.example.com/path/', 'content');
      expect(sourceId).toBe('example.com/path');
    });

    it('should use sha1 hash of content when both article_id and source_link are empty', () => {
      const sourceId = generateSourceId('', '', 'test content');
      expect(sourceId).toBe('1eebdf4fdc9fc7bf283031b93f9aef3338de9052'); // sha1 of "test content"
    });

    it('should throw error when all inputs are empty', () => {
      expect(() => generateSourceId('', '', '')).toThrow('Cannot generate source_id');
    });
  });

  describe('generateModelKey', () => {
    it('should create lowercase key with double colon separator', () => {
      const key = generateModelKey('Nike', 'Air Max 270');
      expect(key).toBe('nike::air max 270');
    });

    it('should handle extra whitespace', () => {
      const key = generateModelKey('  ADIDAS  ', '  Ultra Boost 22  ');
      expect(key).toBe('adidas::ultra boost 22');
    });
  });

  describe('isPayloadRicher', () => {
    const basePayload: ShoeResult = {
      brand_name: 'nike',
      model: 'air max',
      primary_use: null,
      cushioning_type: null,
      heel_height: null,
      forefoot_height: null,
      weight: null,
      foot_width: null,
      drop: null,
      surface_type: null,
      upper_breathability: null,
      carbon_plate: null,
      waterproof: null,
      price: null,
      additional_features: null,
      source_link: 'test.com',
      article_id: '1',
      date: '2023-01-01'
    };

    it('should return true when candidate has more non-null fields', () => {
      const existing = { ...basePayload };
      const candidate = { ...basePayload, weight: 300, price: 150 };

      expect(isPayloadRicher(candidate, existing)).toBe(true);
    });

    it('should return false when existing has more non-null fields', () => {
      const existing = { ...basePayload, weight: 300, price: 150, drop: 10 };
      const candidate = { ...basePayload, weight: 280 };

      expect(isPayloadRicher(candidate, existing)).toBe(false);
    });

    it('should prefer grams over oz for weight', () => {
      const existing = { ...basePayload, weight: 10 }; // likely oz
      const candidate = { ...basePayload, weight: 280 }; // likely grams

      expect(isPayloadRicher(candidate, existing)).toBe(true);
    });

    it('should weight important fields more heavily', () => {
      const existing = { ...basePayload, upper_breathability: 85 }; // 1 regular field
      const candidate = { ...basePayload, weight: 280 }; // 1 important field (weight=2)

      expect(isPayloadRicher(candidate, existing)).toBe(true);
    });
  });

  describe('mergeShoeResults', () => {
    const baseResult: ShoeResult = {
      brand_name: 'nike',
      model: 'air max',
      primary_use: null,
      cushioning_type: null,
      heel_height: null,
      forefoot_height: null,
      weight: null,
      foot_width: null,
      drop: null,
      surface_type: null,
      upper_breathability: null,
      carbon_plate: null,
      waterproof: null,
      price: null,
      additional_features: null,
      source_link: 'test.com',
      article_id: '1',
      date: '2023-01-01'
    };

    it('should prefer non-null values over null', () => {
      const existing = { ...baseResult, weight: null };
      const incoming = { ...baseResult, weight: 300 };

      const merged = mergeShoeResults(existing, incoming);
      expect(merged.weight).toBe(300);
    });

    it('should prefer existing non-null values over incoming null', () => {
      const existing = { ...baseResult, price: 150 };
      const incoming = { ...baseResult, price: null };

      const merged = mergeShoeResults(existing, incoming);
      expect(merged.price).toBe(150);
    });

    it('should prefer grams over oz for weight', () => {
      const existing = { ...baseResult, weight: 10 }; // likely oz
      const incoming = { ...baseResult, weight: 280 }; // likely grams

      const merged = mergeShoeResults(existing, incoming);
      expect(merged.weight).toBe(280);
    });

    it('should prefer longer strings', () => {
      const existing = { ...baseResult, additional_features: 'DNA' };
      const incoming = { ...baseResult, additional_features: 'DNA Loft v3 midsole technology' };

      const merged = mergeShoeResults(existing, incoming);
      expect(merged.additional_features).toBe('DNA Loft v3 midsole technology');
    });
  });

  describe('deduplicateInDocument', () => {
    it('should merge models with same model_key', () => {
      const models: ShoeResult[] = [
        {
          brand_name: 'Nike',
          model: 'Air Max 270',
          weight: null,
          price: 150,
          primary_use: null,
          cushioning_type: null,
          heel_height: null,
          forefoot_height: null,
          foot_width: null,
          drop: null,
          surface_type: null,
          upper_breathability: null,
          carbon_plate: null,
          waterproof: null,
          additional_features: null,
          source_link: 'test.com',
          article_id: '1',
          date: '2023-01-01'
        },
        {
          brand_name: 'nike', // different case, same model
          model: 'air max 270',
          weight: 300,
          price: null,
          primary_use: null,
          cushioning_type: null,
          heel_height: null,
          forefoot_height: null,
          foot_width: null,
          drop: null,
          surface_type: null,
          upper_breathability: null,
          carbon_plate: null,
          waterproof: null,
          additional_features: null,
          source_link: 'test.com',
          article_id: '1',
          date: '2023-01-01'
        }
      ];

      const result = deduplicateInDocument(models);

      expect(result).toHaveLength(1);
      expect(result[0].weight).toBe(300); // merged from second
      expect(result[0].price).toBe(150); // merged from first
    });

    it('should keep different models separate', () => {
      const models: ShoeResult[] = [
        {
          brand_name: 'Nike',
          model: 'Air Max 270',
          weight: 300,
          price: null,
          primary_use: null,
          cushioning_type: null,
          heel_height: null,
          forefoot_height: null,
          foot_width: null,
          drop: null,
          surface_type: null,
          upper_breathability: null,
          carbon_plate: null,
          waterproof: null,
          additional_features: null,
          source_link: 'test.com',
          article_id: '1',
          date: '2023-01-01'
        },
        {
          brand_name: 'Nike',
          model: 'Air Max 90', // different model
          weight: 280,
          price: null,
          primary_use: null,
          cushioning_type: null,
          heel_height: null,
          forefoot_height: null,
          foot_width: null,
          drop: null,
          surface_type: null,
          upper_breathability: null,
          carbon_plate: null,
          waterproof: null,
          additional_features: null,
          source_link: 'test.com',
          article_id: '1',
          date: '2023-01-01'
        }
      ];

      const result = deduplicateInDocument(models);

      expect(result).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const result = deduplicateInDocument([]);
      expect(result).toHaveLength(0);
    });
  });
});