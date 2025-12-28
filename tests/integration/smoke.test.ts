import { describe, it, expect } from 'vitest';

describe('Smoke Test - Module Structure', () => {
  it('should load core types', async () => {
    const types = await import('../../src/core/types');
    expect(types).toBeDefined();
  });

  it('should load core utils', async () => {
    const utils = await import('../../src/core/utils');
    expect(utils.normStr).toBeDefined();
    expect(utils.toNum).toBeDefined();
    expect(utils.round2).toBeDefined();
  });

  it('should load core validation', async () => {
    const validation = await import('../../src/core/validation');
    expect(validation.isValidUsdPrice).toBeDefined();
    expect(validation.isValidHeight).toBeDefined();
  });

  it('should load core mapping', async () => {
    const mapping = await import('../../src/core/mapping');
    expect(mapping.MODEL_TO_BRAND).toBeDefined();
    expect(mapping.normalizeBrand).toBeDefined();
  });

  it('should load core units', async () => {
    const units = await import('../../src/core/units');
    expect(units.ozToGrams).toBeDefined();
    expect(units.convertToUSD).toBeDefined();
  });

  it('should load core logger', async () => {
    const logger = await import('../../src/core/logger');
    expect(logger.createLogger).toBeDefined();
    expect(logger.getLogger).toBeDefined();
  });

  it('should load core metrics', async () => {
    const metrics = await import('../../src/core/metrics');
    expect(metrics.MetricsCollector).toBeDefined();
    expect(metrics.getMetrics).toBeDefined();
  });

  it('should load Supabase integration', async () => {
    const supabase = await import('../../src/integrations/supabase');
    expect(supabase.createSupabaseClient).toBeDefined();
    expect(supabase.getSupabaseClient).toBeDefined();
    expect(supabase.execSql).toBeDefined();
  });

  it('should load LLM module', async () => {
    const llm = await import('../../src/llm');
    expect(llm.extractWithLLM).toBeDefined();
    expect(llm.extractWithRegex).toBeDefined();
    expect(llm.generateSystemPrompt).toBeDefined();
    expect(llm.callOpenAI).toBeDefined();
    expect(llm.validateLLMResponse).toBeDefined();
  });
});

describe('Smoke Test - Core Utils Functionality', () => {
  it('normStr should normalize strings correctly', async () => {
    const { normStr } = await import('../../src/core/utils');
    expect(normStr('  hello  ')).toBe('hello');
    expect(normStr('')).toBe(null);
    expect(normStr(null)).toBe(null);
  });

  it('toNum should convert to numbers correctly', async () => {
    const { toNum } = await import('../../src/core/utils');
    expect(toNum('123')).toBe(123);
    expect(toNum('12.34')).toBe(12.34);
    expect(toNum('abc')).toBe(null);
  });

  it('isValidUsdPrice should validate prices', async () => {
    const { isValidUsdPrice } = await import('../../src/core/validation');
    expect(isValidUsdPrice(100)).toBe(true);
    expect(isValidUsdPrice(30)).toBe(false);
    expect(isValidUsdPrice(600)).toBe(false);
  });

  it('ozToGrams should convert weight', async () => {
    const { ozToGrams } = await import('../../src/core/units');
    expect(ozToGrams(10)).toBe(284); // 10 * 28.35 ≈ 284
  });

  it('convertToUSD should convert currencies', async () => {
    const { convertToUSD } = await import('../../src/core/units');
    expect(convertToUSD(100, 'USD')).toBe(100);
    expect(convertToUSD(100, 'EUR')).toBe(108);
    expect(convertToUSD(100, 'GBP')).toBe(126);
  });
});
