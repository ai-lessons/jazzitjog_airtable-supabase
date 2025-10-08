import "dotenv/config";
import type { PipelineConfig } from './run';
/**
 * Run ETL pipeline to staging table (for review)
 */
export declare function runStagingPipeline(config: PipelineConfig): Promise<{
    newItems: number;
    metrics?: undefined;
} | {
    newItems: number;
    metrics: string;
}>;
//# sourceMappingURL=run-staging.d.ts.map