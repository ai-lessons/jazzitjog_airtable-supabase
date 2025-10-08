/**
 * Result of upserting a single shoe
 */
export type UpsertResult = {
    model_key: string;
    success: boolean;
    created: boolean;
    error?: string;
};
/**
 * Summary of upsert operation
 */
export type UpsertSummary = {
    total: number;
    successful: number;
    failed: number;
    created: number;
    updated: number;
    errors: Array<{
        model_key: string;
        error: string;
    }>;
};
//# sourceMappingURL=types.d.ts.map