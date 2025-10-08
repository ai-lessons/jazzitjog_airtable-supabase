export type SneakerSpec = {
    brand_name: string | null;
    model: string | null;
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
};
export type ExtractionResult = {
    sneakers: SneakerSpec[];
    method: "llm" | "regex" | "hybrid";
    confidence: number;
};
export type TitleAnalysis = {
    scenario: "specific" | "general" | "brand-only" | "irrelevant";
    brand?: string;
    model?: string;
    confidence: number;
};
export type ExtractionOptions = {
    titleAnalysis?: TitleAnalysis;
    date?: string | null;
    source_link?: string | null;
    useRegexFirst?: boolean;
};
export type LLMExtractionRequest = {
    content: string;
    title?: string;
    systemPrompt: string;
    temperature?: number;
};
export type LLMRawResponse = {
    items?: any[];
    sneakers?: any[];
    models?: any[];
    model?: any;
};
//# sourceMappingURL=types.d.ts.map