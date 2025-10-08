export interface PipelineMetrics {
    articlesProcessed: number;
    articlesSkipped: number;
    articlesFailed: number;
    sneakersExtracted: number;
    sneakersRejected: number;
    sneakersDeduped: number;
    validationErrors: number;
    llmCallsTotal: number;
    llmCallsFailed: number;
    regexFallbacks: number;
    regexSuccess: number;
    llmFallbacks: number;
    fieldCoverage: Record<string, number>;
    averageCoverages: number[];
    startTime: number;
    endTime: number | null;
    processingTimeMs: number | null;
    upsertSuccessful: number;
    upsertFailed: number;
    recordsCreated: number;
    recordsUpdated: number;
}
export declare class MetricsCollector {
    private metrics;
    constructor();
    private createEmptyMetrics;
    incrementArticlesProcessed(): void;
    incrementArticlesSkipped(): void;
    incrementArticlesFailed(): void;
    incrementSneakersExtracted(count?: number): void;
    incrementSneakersRejected(count?: number): void;
    incrementSneakersDeduped(count?: number): void;
    incrementValidationErrors(): void;
    incrementLlmCalls(): void;
    incrementLlmFailed(): void;
    incrementRegexFallbacks(): void;
    incrementRegexSuccess(): void;
    incrementLlmFallbacks(): void;
    incrementFieldCoverage(fieldName: string): void;
    recordAverageCoverage(coverage: number): void;
    incrementUpsertSuccessful(count?: number): void;
    incrementUpsertFailed(count?: number): void;
    incrementRecordsCreated(count?: number): void;
    incrementRecordsUpdated(count?: number): void;
    finish(): void;
    getMetrics(): Readonly<PipelineMetrics>;
    getSummary(): string;
    reset(): void;
}
export declare function getMetrics(): MetricsCollector;
export declare function resetMetrics(): void;
//# sourceMappingURL=metrics.d.ts.map