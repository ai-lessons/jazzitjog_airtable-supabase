import type { SneakerData } from './simple-parser';
export interface DatabaseRecord {
    id?: number;
    article_id: number;
    record_id: string;
    brand_name: string;
    model: string;
    model_key: string;
    primary_use?: string;
    surface_type?: string;
    heel_height?: number;
    forefoot_height?: number;
    drop?: number;
    weight?: number;
    price?: number;
    carbon_plate?: boolean;
    waterproof?: boolean;
    cushioning_type?: string;
    foot_width?: string;
    upper_breathability?: string;
    date?: string;
    source_link?: string;
    created_at?: string;
    updated_at?: string;
}
export declare class SimpleDatabase {
    private supabase;
    constructor(supabaseUrl: string, supabaseKey: string);
    saveSneakers(article_id: number, record_id: string, sneakers: SneakerData[]): Promise<{
        success: number;
        errors: string[];
    }>;
    private sneakerToRecord;
    private makeModelKey;
    private upsertRecord;
    private findExisting;
    private mergeRecords;
    getStats(): Promise<{
        total_records: number;
        unique_models: number;
        brands: string[];
    }>;
    clearAll(): Promise<{
        success: boolean;
        deleted_count: number;
        error?: string;
    }>;
}
//# sourceMappingURL=simple-db.d.ts.map