export type Counters = Record<string, number>;
export declare function getWatermark(): Promise<{
    last_airtable_created_at: any;
    last_run_at: any;
    counters: any;
}>;
export declare function setWatermark(next: {
    last_airtable_created_at: string;
    counters?: Counters;
}): Promise<void>;
export declare function resetWatermark(): Promise<void>;
//# sourceMappingURL=watermark.d.ts.map