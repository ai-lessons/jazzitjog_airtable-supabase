export interface AirtableRecord {
    id: string;
    fields: {
        [key: string]: any;
    };
}
export interface SyncConfig {
    airtable: {
        apiKey: string;
        baseId: string;
        tableName: string;
    };
    supabase: {
        url: string;
        key: string;
    };
    openai: {
        apiKey: string;
    };
    batchSize?: number;
}
export interface SyncResult {
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
    sneakers_extracted: number;
}
export declare class SimpleSyncProcessor {
    private parser;
    private database;
    private airtable;
    private config;
    constructor(config: SyncConfig);
    syncFromAirtable(limit?: number): Promise<SyncResult>;
    fetchAirtableRecords(limit?: number): Promise<AirtableRecord[]>;
    private processBatch;
    private processRecord;
    mapAirtableRecord(record: AirtableRecord): {
        article_id: number;
        airtable_id: string;
        title: string;
        content: string;
        date?: string;
        source_link?: string;
    } | null;
    getStats(): Promise<{
        total_records: number;
        unique_models: number;
        brands: string[];
    }>;
    clearDatabase(): Promise<{
        success: boolean;
        deleted_count: number;
        error?: string;
    }>;
}
//# sourceMappingURL=simple-sync.d.ts.map