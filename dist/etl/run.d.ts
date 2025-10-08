import "dotenv/config";
import type { DatabaseConfig } from '../integrations/supabase/client';
/**
 * Pipeline configuration
 */
export type PipelineConfig = {
    airtable: {
        apiKey: string;
        baseId: string;
        tableName: string;
    };
    database: DatabaseConfig;
    openaiApiKey: string;
    maxRecords?: number;
    dryRun?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
};
/**
 * Run the full ETL pipeline
 */
export declare function runPipeline(config: PipelineConfig): Promise<void>;
/**
 * Run pipeline from environment variables
 */
export declare function runPipelineFromEnv(): Promise<void>;
//# sourceMappingURL=run.d.ts.map