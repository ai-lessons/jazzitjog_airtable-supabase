export type ShoeResult = {
    brand_name: string;
    model: string;
    primary_use?: string | null;
    cushioning_type?: string | null;
    heel_height?: number | null;
    forefoot_height?: number | null;
    weight?: number | null;
    foot_width?: string | null;
    drop?: number | null;
    surface_type?: string | null;
    upper_breathability?: number | null;
    carbon_plate?: boolean | null;
    waterproof?: boolean | null;
    price?: number | null;
    additional_features?: string | null;
    source_link: string;
    article_id: string;
    date?: string | null;
    source_id?: string;
};
/**
 * Check if a model exists in the database by model_key and source_id
 */
export declare function existsByModelAndSource(brandName: string, model: string, sourceId: string): Promise<ShoeResult | null>;
/**
 * Upsert with deduplication logic.
 * Before inserting, check if model exists with same source_id.
 * If exists: update only if new payload is strictly richer, else skip.
 * If not exists: insert.
 */
export declare function upsertWithDeduplication(rows: ShoeResult[]): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
}>;
/**
 * Upsert пачкой. Разрезает rows на куски (по умолчанию 500), чтобы не упереться в лимиты.
 * Идемпотентно по (article_id, source_link) — дубликатов не будет.
 *
 * @deprecated Use upsertWithDeduplication for new deduplication logic
 */
export declare function upsertResultsBatch(rows: ShoeResult[], chunk?: number): Promise<void>;
//# sourceMappingURL=upsertResults.d.ts.map