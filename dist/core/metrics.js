"use strict";
// Pipeline metrics tracking
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
exports.getMetrics = getMetrics;
exports.resetMetrics = resetMetrics;
class MetricsCollector {
    metrics;
    constructor() {
        this.metrics = this.createEmptyMetrics();
    }
    createEmptyMetrics() {
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
    incrementArticlesProcessed() {
        this.metrics.articlesProcessed++;
    }
    incrementArticlesSkipped() {
        this.metrics.articlesSkipped++;
    }
    incrementArticlesFailed() {
        this.metrics.articlesFailed++;
    }
    incrementSneakersExtracted(count = 1) {
        this.metrics.sneakersExtracted += count;
    }
    incrementSneakersRejected(count = 1) {
        this.metrics.sneakersRejected += count;
    }
    incrementSneakersDeduped(count = 1) {
        this.metrics.sneakersDeduped += count;
    }
    incrementValidationErrors() {
        this.metrics.validationErrors++;
    }
    incrementLlmCalls() {
        this.metrics.llmCallsTotal++;
    }
    incrementLlmFailed() {
        this.metrics.llmCallsFailed++;
    }
    incrementRegexFallbacks() {
        this.metrics.regexFallbacks++;
    }
    incrementRegexSuccess() {
        this.metrics.regexSuccess++;
    }
    incrementLlmFallbacks() {
        this.metrics.llmFallbacks++;
    }
    // Coverage tracking
    incrementFieldCoverage(fieldName) {
        this.metrics.fieldCoverage[fieldName] = (this.metrics.fieldCoverage[fieldName] || 0) + 1;
    }
    recordAverageCoverage(coverage) {
        this.metrics.averageCoverages.push(coverage);
    }
    incrementUpsertSuccessful(count = 1) {
        this.metrics.upsertSuccessful += count;
    }
    incrementUpsertFailed(count = 1) {
        this.metrics.upsertFailed += count;
    }
    incrementRecordsCreated(count = 1) {
        this.metrics.recordsCreated += count;
    }
    incrementRecordsUpdated(count = 1) {
        this.metrics.recordsUpdated += count;
    }
    // Finalize metrics
    finish() {
        this.metrics.endTime = Date.now();
        this.metrics.processingTimeMs = this.metrics.endTime - this.metrics.startTime;
    }
    // Get current metrics
    getMetrics() {
        return { ...this.metrics };
    }
    // Get summary
    getSummary() {
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
    reset() {
        this.metrics = this.createEmptyMetrics();
    }
}
exports.MetricsCollector = MetricsCollector;
// Global metrics instance
let globalMetrics = null;
function getMetrics() {
    if (!globalMetrics) {
        globalMetrics = new MetricsCollector();
    }
    return globalMetrics;
}
function resetMetrics() {
    globalMetrics = new MetricsCollector();
}
//# sourceMappingURL=metrics.js.map