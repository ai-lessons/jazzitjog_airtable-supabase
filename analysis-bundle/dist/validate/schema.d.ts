import { z } from 'zod';
export declare const AirtableRecordSchema: z.ZodObject<{
    id: z.ZodString;
    fields: z.ZodObject<{
        ID: z.ZodNumber;
        Title: z.ZodString;
        Content: z.ZodString;
        'Article link': z.ZodOptional<z.ZodString>;
        Published: z.ZodOptional<z.ZodString>;
        'Time created': z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        ID: number;
        Title: string;
        Content: string;
        'Article link'?: string | undefined;
        Published?: string | undefined;
        'Time created'?: string | undefined;
    }, {
        ID: number;
        Title: string;
        Content: string;
        'Article link'?: string | undefined;
        Published?: string | undefined;
        'Time created'?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    fields: {
        ID: number;
        Title: string;
        Content: string;
        'Article link'?: string | undefined;
        Published?: string | undefined;
        'Time created'?: string | undefined;
    };
}, {
    id: string;
    fields: {
        ID: number;
        Title: string;
        Content: string;
        'Article link'?: string | undefined;
        Published?: string | undefined;
        'Time created'?: string | undefined;
    };
}>;
export declare const SneakerDataSchema: z.ZodObject<{
    brand: z.ZodString;
    model: z.ZodString;
    primary_use: z.ZodOptional<z.ZodEnum<["daily_trainer", "tempo", "racing", "trail", "stability", "max_cushion", "hiking", "walking", "trail_walking", "water_sports", "casual"]>>;
    cushioning_type: z.ZodOptional<z.ZodEnum<["soft", "firm", "responsive", "max", "minimal", "balanced"]>>;
    heel_height: z.ZodOptional<z.ZodNumber>;
    forefoot_height: z.ZodOptional<z.ZodNumber>;
    weight: z.ZodOptional<z.ZodNumber>;
    foot_width: z.ZodOptional<z.ZodEnum<["narrow", "medium", "wide", "regular"]>>;
    drop: z.ZodOptional<z.ZodNumber>;
    surface_type: z.ZodOptional<z.ZodEnum<["road", "trail", "mixed", "track", "water", "sand"]>>;
    upper_breathability: z.ZodOptional<z.ZodEnum<["breathable", "mesh", "knit", "standard", "engineered mesh", "synthetic"]>>;
    carbon_plate: z.ZodOptional<z.ZodEnum<["yes", "no", "partial"]>>;
    waterproof: z.ZodOptional<z.ZodEnum<["goretex", "waterproof", "water_resistant", "none"]>>;
    price: z.ZodOptional<z.ZodNumber>;
    additional_features: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    brand: string;
    model: string;
    primary_use?: "daily_trainer" | "tempo" | "racing" | "trail" | "stability" | "max_cushion" | "hiking" | "walking" | "trail_walking" | "water_sports" | "casual" | undefined;
    cushioning_type?: "soft" | "firm" | "responsive" | "max" | "minimal" | "balanced" | undefined;
    heel_height?: number | undefined;
    forefoot_height?: number | undefined;
    weight?: number | undefined;
    foot_width?: "narrow" | "medium" | "wide" | "regular" | undefined;
    drop?: number | undefined;
    surface_type?: "trail" | "road" | "mixed" | "track" | "water" | "sand" | undefined;
    upper_breathability?: "breathable" | "mesh" | "knit" | "standard" | "engineered mesh" | "synthetic" | undefined;
    carbon_plate?: "yes" | "no" | "partial" | undefined;
    waterproof?: "goretex" | "waterproof" | "water_resistant" | "none" | undefined;
    price?: number | undefined;
    additional_features?: string | undefined;
}, {
    brand: string;
    model: string;
    primary_use?: "daily_trainer" | "tempo" | "racing" | "trail" | "stability" | "max_cushion" | "hiking" | "walking" | "trail_walking" | "water_sports" | "casual" | undefined;
    cushioning_type?: "soft" | "firm" | "responsive" | "max" | "minimal" | "balanced" | undefined;
    heel_height?: number | undefined;
    forefoot_height?: number | undefined;
    weight?: number | undefined;
    foot_width?: "narrow" | "medium" | "wide" | "regular" | undefined;
    drop?: number | undefined;
    surface_type?: "trail" | "road" | "mixed" | "track" | "water" | "sand" | undefined;
    upper_breathability?: "breathable" | "mesh" | "knit" | "standard" | "engineered mesh" | "synthetic" | undefined;
    carbon_plate?: "yes" | "no" | "partial" | undefined;
    waterproof?: "goretex" | "waterproof" | "water_resistant" | "none" | undefined;
    price?: number | undefined;
    additional_features?: string | undefined;
}>;
export declare const FinalSneakerRecordSchema: z.ZodObject<{
    brand: z.ZodString;
    model: z.ZodString;
    primary_use: z.ZodOptional<z.ZodEnum<["daily_trainer", "tempo", "racing", "trail", "stability", "max_cushion", "hiking", "walking", "trail_walking", "water_sports", "casual"]>>;
    cushioning_type: z.ZodOptional<z.ZodEnum<["soft", "firm", "responsive", "max", "minimal", "balanced"]>>;
    heel_height: z.ZodOptional<z.ZodNumber>;
    forefoot_height: z.ZodOptional<z.ZodNumber>;
    weight: z.ZodOptional<z.ZodNumber>;
    foot_width: z.ZodOptional<z.ZodEnum<["narrow", "medium", "wide", "regular"]>>;
    drop: z.ZodOptional<z.ZodNumber>;
    surface_type: z.ZodOptional<z.ZodEnum<["road", "trail", "mixed", "track", "water", "sand"]>>;
    upper_breathability: z.ZodOptional<z.ZodEnum<["breathable", "mesh", "knit", "standard", "engineered mesh", "synthetic"]>>;
    carbon_plate: z.ZodOptional<z.ZodEnum<["yes", "no", "partial"]>>;
    waterproof: z.ZodOptional<z.ZodEnum<["goretex", "waterproof", "water_resistant", "none"]>>;
    price: z.ZodOptional<z.ZodNumber>;
    additional_features: z.ZodOptional<z.ZodString>;
} & {
    brand_name: z.ZodString;
    source_link: z.ZodOptional<z.ZodString>;
    article_id: z.ZodNumber;
    date: z.ZodString;
    quality_level: z.ZodNumber;
    validation_score: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    date: string;
    brand: string;
    model: string;
    brand_name: string;
    article_id: number;
    quality_level: number;
    validation_score: number;
    primary_use?: "daily_trainer" | "tempo" | "racing" | "trail" | "stability" | "max_cushion" | "hiking" | "walking" | "trail_walking" | "water_sports" | "casual" | undefined;
    cushioning_type?: "soft" | "firm" | "responsive" | "max" | "minimal" | "balanced" | undefined;
    heel_height?: number | undefined;
    forefoot_height?: number | undefined;
    weight?: number | undefined;
    foot_width?: "narrow" | "medium" | "wide" | "regular" | undefined;
    drop?: number | undefined;
    surface_type?: "trail" | "road" | "mixed" | "track" | "water" | "sand" | undefined;
    upper_breathability?: "breathable" | "mesh" | "knit" | "standard" | "engineered mesh" | "synthetic" | undefined;
    carbon_plate?: "yes" | "no" | "partial" | undefined;
    waterproof?: "goretex" | "waterproof" | "water_resistant" | "none" | undefined;
    price?: number | undefined;
    additional_features?: string | undefined;
    source_link?: string | undefined;
}, {
    date: string;
    brand: string;
    model: string;
    brand_name: string;
    article_id: number;
    quality_level: number;
    validation_score: number;
    primary_use?: "daily_trainer" | "tempo" | "racing" | "trail" | "stability" | "max_cushion" | "hiking" | "walking" | "trail_walking" | "water_sports" | "casual" | undefined;
    cushioning_type?: "soft" | "firm" | "responsive" | "max" | "minimal" | "balanced" | undefined;
    heel_height?: number | undefined;
    forefoot_height?: number | undefined;
    weight?: number | undefined;
    foot_width?: "narrow" | "medium" | "wide" | "regular" | undefined;
    drop?: number | undefined;
    surface_type?: "trail" | "road" | "mixed" | "track" | "water" | "sand" | undefined;
    upper_breathability?: "breathable" | "mesh" | "knit" | "standard" | "engineered mesh" | "synthetic" | undefined;
    carbon_plate?: "yes" | "no" | "partial" | undefined;
    waterproof?: "goretex" | "waterproof" | "water_resistant" | "none" | undefined;
    price?: number | undefined;
    additional_features?: string | undefined;
    source_link?: string | undefined;
}>;
export type AirtableRecord = z.infer<typeof AirtableRecordSchema>;
export type SneakerData = z.infer<typeof SneakerDataSchema>;
export type FinalSneakerRecord = z.infer<typeof FinalSneakerRecordSchema>;
//# sourceMappingURL=schema.d.ts.map