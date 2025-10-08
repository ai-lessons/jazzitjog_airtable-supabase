import type { AirtableRecord, FetchOptions } from './types';
export declare class AirtableClient {
    private base;
    private tableName;
    constructor(config: {
        apiKey: string;
        baseId: string;
        tableName: string;
    });
    /**
     * Fetch records from Airtable table
     */
    fetchRecords(options?: FetchOptions): Promise<AirtableRecord[]>;
    /**
     * Fetch single record by ID
     */
    fetchRecordById(recordId: string): Promise<AirtableRecord | null>;
}
/**
 * Create Airtable client from config
 */
export declare function createAirtableClient(config: {
    apiKey: string;
    baseId: string;
    tableName: string;
}): AirtableClient;
//# sourceMappingURL=client.d.ts.map