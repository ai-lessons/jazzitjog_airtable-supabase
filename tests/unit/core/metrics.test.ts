import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector, getMetrics, resetMetrics } from '../../../src/core/metrics';

describe('MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  it('should initialize with zero values', () => {
    const m = metrics.getMetrics();
    expect(m.articlesProcessed).toBe(0);
    expect(m.sneakersExtracted).toBe(0);
    expect(m.llmCallsTotal).toBe(0);
    expect(m.startTime).toBeGreaterThan(0);
    expect(m.endTime).toBe(null);
  });

  it('should increment article counters', () => {
    metrics.incrementArticlesProcessed();
    metrics.incrementArticlesProcessed();
    metrics.incrementArticlesSkipped();
    metrics.incrementArticlesFailed();

    const m = metrics.getMetrics();
    expect(m.articlesProcessed).toBe(2);
    expect(m.articlesSkipped).toBe(1);
    expect(m.articlesFailed).toBe(1);
  });

  it('should increment sneaker counters', () => {
    metrics.incrementSneakersExtracted(5);
    metrics.incrementSneakersRejected(2);
    metrics.incrementSneakersDeduped(1);

    const m = metrics.getMetrics();
    expect(m.sneakersExtracted).toBe(5);
    expect(m.sneakersRejected).toBe(2);
    expect(m.sneakersDeduped).toBe(1);
  });

  it('should increment LLM counters', () => {
    metrics.incrementLlmCalls();
    metrics.incrementLlmCalls();
    metrics.incrementLlmFailed();
    metrics.incrementRegexFallbacks();

    const m = metrics.getMetrics();
    expect(m.llmCallsTotal).toBe(2);
    expect(m.llmCallsFailed).toBe(1);
    expect(m.regexFallbacks).toBe(1);
  });

  it('should increment database counters', () => {
    metrics.incrementUpsertSuccessful(10);
    metrics.incrementUpsertFailed(2);
    metrics.incrementRecordsCreated(8);
    metrics.incrementRecordsUpdated(2);

    const m = metrics.getMetrics();
    expect(m.upsertSuccessful).toBe(10);
    expect(m.upsertFailed).toBe(2);
    expect(m.recordsCreated).toBe(8);
    expect(m.recordsUpdated).toBe(2);
  });

  it('should finish and calculate processing time', () => {
    const beforeFinish = metrics.getMetrics();
    expect(beforeFinish.endTime).toBe(null);
    expect(beforeFinish.processingTimeMs).toBe(null);

    metrics.finish();

    const afterFinish = metrics.getMetrics();
    expect(afterFinish.endTime).toBeGreaterThan(0);
    expect(afterFinish.processingTimeMs).toBeGreaterThanOrEqual(0); // Can be 0 for very fast execution
  });

  it('should generate summary string', () => {
    metrics.incrementArticlesProcessed();
    metrics.incrementSneakersExtracted(5);
    metrics.incrementLlmCalls();
    metrics.finish();

    const summary = metrics.getSummary();
    expect(summary).toContain('Pipeline Metrics Summary');
    expect(summary).toContain('Articles Processed: 1');
    expect(summary).toContain('Sneakers Extracted: 5');
    expect(summary).toContain('Total Calls:        1');
  });

  it('should reset metrics', () => {
    metrics.incrementArticlesProcessed();
    metrics.incrementSneakersExtracted(5);

    let m = metrics.getMetrics();
    expect(m.articlesProcessed).toBe(1);

    metrics.reset();

    m = metrics.getMetrics();
    expect(m.articlesProcessed).toBe(0);
    expect(m.sneakersExtracted).toBe(0);
  });
});

describe('Global metrics', () => {
  it('should return singleton instance', () => {
    const m1 = getMetrics();
    const m2 = getMetrics();
    expect(m1).toBe(m2);
  });

  it('should reset global metrics', () => {
    const m1 = getMetrics();
    m1.incrementArticlesProcessed();

    resetMetrics();

    const m2 = getMetrics();
    expect(m2.getMetrics().articlesProcessed).toBe(0);
  });
});
