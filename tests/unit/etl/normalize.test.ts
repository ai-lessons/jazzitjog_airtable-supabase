import { describe, it, expect } from 'vitest';
import { normalizeSneaker } from '@/etl/normalize/orchestrator';
import { generateModelKey } from '@/etl/build/model_key';
import type { SneakerSpec } from '@/llm/types';

describe('Normalize Module', () => {
  it('should normalize brand name', () => {
    const sneaker: SneakerSpec = {
      brand_name: 'NIKE',
      model: 'Vaporfly 3',
      heel_height: null,
      forefoot_height: null,
      drop: null,
      weight: null,
      price: null,
      upper_breathability: null,
      carbon_plate: null,
      waterproof: null,
      primary_use: null,
      cushioning_type: null,
      surface_type: null,
      foot_width: null,
      additional_features: null,
    };

    const result = normalizeSneaker(sneaker);

    expect(result.sneaker.brand_name).toBe('Nike');
    expect(result.changes.length).toBeGreaterThan(0);
  });

  it('should normalize weight from oz to grams', () => {
    const sneaker: SneakerSpec = {
      brand_name: 'Nike',
      model: 'Vaporfly 3',
      weight: 7.5, // oz
      heel_height: null,
      forefoot_height: null,
      drop: null,
      price: null,
      upper_breathability: null,
      carbon_plate: null,
      waterproof: null,
      primary_use: null,
      cushioning_type: null,
      surface_type: null,
      foot_width: null,
      additional_features: null,
    };

    const result = normalizeSneaker(sneaker);

    expect(result.sneaker.weight).toBeGreaterThan(200); // ~212g
    expect(result.changes.some(c => c.field === 'weight')).toBe(true);
  });

  it('should calculate drop from heel and forefoot', () => {
    const sneaker: SneakerSpec = {
      brand_name: 'Nike',
      model: 'Vaporfly 3',
      heel_height: 40,
      forefoot_height: 32,
      drop: null,
      weight: null,
      price: null,
      upper_breathability: null,
      carbon_plate: null,
      waterproof: null,
      primary_use: null,
      cushioning_type: null,
      surface_type: null,
      foot_width: null,
      additional_features: null,
    };

    const result = normalizeSneaker(sneaker);

    expect(result.sneaker.drop).toBe(8);
    expect(result.changes.some(c => c.field === 'drop')).toBe(true);
  });

  it('should normalize enum fields to lowercase', () => {
    const sneaker: SneakerSpec = {
      brand_name: 'Nike',
      model: 'Vaporfly 3',
      heel_height: null,
      forefoot_height: null,
      drop: null,
      weight: null,
      price: null,
      upper_breathability: 'HIGH' as any,
      carbon_plate: null,
      waterproof: null,
      primary_use: null,
      cushioning_type: 'MAX' as any,
      surface_type: 'ROAD' as any,
      foot_width: null,
      additional_features: null,
    };

    const result = normalizeSneaker(sneaker);

    expect(result.sneaker.upper_breathability).toBe('high');
    expect(result.sneaker.cushioning_type).toBe('max');
    expect(result.sneaker.surface_type).toBe('road');
  });

  describe('Build Module', () => {
    it('should generate model_key correctly', () => {
      const key1 = generateModelKey('Nike', 'Vaporfly 3');
      expect(key1).toBe('nike vaporfly 3');

      const key2 = generateModelKey('Hoka', 'Speedgoat 5');
      expect(key2).toBe('hoka speedgoat 5');

      const key3 = generateModelKey('Adidas', 'Adizero Pro 3');
      expect(key3).toBe('adidas adizero pro 3');
    });

    it('should handle special characters in model_key', () => {
      const key = generateModelKey('On', 'Cloud-X 3');
      expect(key).toBe('on cloud x 3');
    });

    it('should return empty string for missing values', () => {
      const key = generateModelKey(null, null);
      expect(key).toBe('');
    });
  });
});
