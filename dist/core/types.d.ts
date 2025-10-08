export type ShoeInput = {
    article_id: string;
    record_id: string | null;
    brand_name: string;
    model: string;
    model_key: string;
    heel_height: number | null;
    forefoot_height: number | null;
    drop: number | null;
    weight: number | null;
    price: number | null;
    upper_breathability: "low" | "medium" | "high" | null;
    carbon_plate: boolean | null;
    waterproof: boolean | null;
    primary_use: string | null;
    cushioning_type: "firm" | "balanced" | "max" | null;
    surface_type: "road" | "trail" | null;
    foot_width: "narrow" | "standard" | "wide" | null;
    additional_features: string | null;
    date: string | null;
    source_link: string | null;
};
export type AirtableRecord = {
    id: string;
    fields: Record<string, any>;
};
export type PipelineConfig = {
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
};
//# sourceMappingURL=types.d.ts.map