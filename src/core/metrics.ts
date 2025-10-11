// Pipeline metrics tracking

export interface PipelineMetrics {
  // Input metrics
  articlesProcessed: number;
  articlesSkipped: number;
  articlesFailed: number;

  // Extraction metrics
  sneakersExtracted: number;
  sneakersRejected: number;
  sneakersDeduped: number;

  // Quality metrics
  validationErrors: number;
  llmCallsTotal: number;
  llmCallsFailed: number;
  regexFallbacks: number;
  regexSuccess: number;
  llmFallbacks: number;

  // Coverage metrics
  fieldCoverage: Record<string, number>;
  averageCoverages: number[];

  // Performance metrics
  startTime: number;
  endTime: number | null;
  processingTimeMs: number | null;

  // Database metrics
  upsertSuccessful: number;
  upsertFailed: number;
  recordsCreated: number;
  recordsUpdated: number;
}

export class MetricsCollector {
  private metrics: PipelineMetrics;

  constructor() {
    this.metrics = this.createEmptyMetrics();
  }

  private createEmptyMetrics(): PipelineMetrics {
    return {
      articlesProcessed: 0,
      articlesSkipped: 0,
      articlesFailed: 0,
      sneakersExtracted: 0,
      sneakersRejected: 0,
      sneakersDeduped: 0,
      validationErrors: 0,
      llmCallsTotal: 0,
      llmCallsFailed: 0,
      regexFallbacks: 0,
      regexSuccess: 0,
      llmFallbacks: 0,
      fieldCoverage: {},
      averageCoverages: [],
      startTime: Date.now(),
      endTime: null,
      processingTimeMs: null,
      upsertSuccessful: 0,
      upsertFailed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
    };
  }

  // Increment counters
  incrementArticlesProcessed(): void {
    this.metrics.articlesProcessed++;
  }

  incrementArticlesSkipped(): void {
    this.metrics.articlesSkipped++;
  }

  incrementArticlesFailed(): void {
    this.metrics.articlesFailed++;
  }

  incrementSneakersExtracted(count: number = 1): void {
    this.metrics.sneakersExtracted += count;
  }

  incrementSneakersRejected(count: number = 1): void {
    this.metrics.sneakersRejected += count;
  }

  incrementSneakersDeduped(count: number = 1): void {
    this.metrics.sneakersDeduped += count;
  }

  incrementValidationErrors(): void {
    this.metrics.validationErrors++;
  }

  incrementLlmCalls(): void {
    this.metrics.llmCallsTotal++;
  }

  incrementLlmFailed(): void {
    this.metrics.llmCallsFailed++;
  }

  incrementRegexFallbacks(): void {
    this.metrics.regexFallbacks++;
  }

  incrementRegexSuccess(): void {
    this.metrics.regexSuccess++;
  }

  incrementLlmFallbacks(): void {
    this.metrics.llmFallbacks++;
  }

  // Coverage tracking
  incrementFieldCoverage(fieldName: string): void {
    this.metrics.fieldCoverage[fieldName] = (this.metrics.fieldCoverage[fieldName] || 0) + 1;
  }

  recordAverageCoverage(coverage: number): void {
    this.metrics.averageCoverages.push(coverage);
  }

  incrementUpsertSuccessful(count: number = 1): void {
    this.metrics.upsertSuccessful += count;
  }

  incrementUpsertFailed(count: number = 1): void {
    this.metrics.upsertFailed += count;
  }

  incrementRecordsCreated(count: number = 1): void {
    this.metrics.recordsCreated += count;
  }

  incrementRecordsUpdated(count: number = 1): void {
    this.metrics.recordsUpdated += count;
  }

  // Finalize metrics
  finish(): void {
    this.metrics.endTime = Date.now();
    this.metrics.processingTimeMs = this.metrics.endTime - this.metrics.startTime;
  }

  // Get current metrics
  getMetrics(): Readonly<PipelineMetrics> {
    return { ...this.metrics };
  }

  // Get summary
  getSummary(): string {
    const m = this.metrics;
    const duration = m.processingTimeMs
      ? `${(m.processingTimeMs / 1000).toFixed(2)}s`
      : 'in progress';

    const avgCoverage = m.averageCoverages.length > 0
      ? (m.averageCoverages.reduce((a, b) => a + b, 0) / m.averageCoverages.length).toFixed(1)
      : 'N/A';

    return `
📊 Pipeline Metrics Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 Input:
  Articles Processed: ${m.articlesProcessed}
  Articles Skipped:   ${m.articlesSkipped}
  Articles Failed:    ${m.articlesFailed}

👟 Extraction:
  Sneakers Extracted: ${m.sneakersExtracted}
  Sneakers Rejected:  ${m.sneakersRejected}
  Sneakers Deduped:   ${m.sneakersDeduped}

🤖 LLM:
  Total Calls:        ${m.llmCallsTotal}
  Failed Calls:       ${m.llmCallsFailed}
  Regex Success:      ${m.regexSuccess}
  LLM Fallbacks:      ${m.llmFallbacks}

📈 Coverage:
  Average Coverage:   ${avgCoverage}%
  Field Coverage:     ${Object.keys(m.fieldCoverage).length} fields tracked

✅ Database:
  Upsert Successful:  ${m.upsertSuccessful}
  Upsert Failed:      ${m.upsertFailed}
  Records Created:    ${m.recordsCreated}
  Records Updated:    ${m.recordsUpdated}

⏱️  Performance:
  Duration:           ${duration}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  // Reset metrics
  reset(): void {
    this.metrics = this.createEmptyMetrics();
  }
}

// Global metrics instance
let globalMetrics: MetricsCollector | null = null;

export function getMetrics(): MetricsCollector {
  if (!globalMetrics) {
    globalMetrics = new MetricsCollector();
  }
  return globalMetrics;
}

export function resetMetrics(): void {
  globalMetrics = new MetricsCollector();
}

