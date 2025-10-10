export interface SneakerData {
    brand: string;
    model: string;
    use?: string;
    surface?: "road" | "trail";
    heel?: number;
    forefoot?: number;
    drop?: number;
    weight?: number;
    price?: number;
    plate?: boolean;
    waterproof?: boolean;
    cushioning?: "firm" | "balanced" | "max";
    width?: "narrow" | "standard" | "wide";
    breathability?: "low" | "medium" | "high";
    date?: string;
    source?: string;
}
export interface ProcessedArticle {
    article_id: number;
    airtable_id: string;
    title: string;
    content: string;
    date?: string;
    source_link?: string;
    sneakers: SneakerData[];
}
export interface TitleAnalysis {
    scenario: 'specific' | 'general' | 'brand-only' | 'irrelevant';
    brand?: string;
    model?: string;
    confidence: number;
}
export declare class SimpleSneakerParser {
    private openai;
    constructor(apiKey: string);
    parseArticle(data: {
        article_id: number;
        airtable_id: string;
        title: string;
        content: string;
        date?: string;
        source_link?: string;
    }): Promise<ProcessedArticle>;
    analyzeTitle(title: string): TitleAnalysis;
    private extractSneakers;
    private filterRelevantSneakers;
    private isRelevantSneaker;
    private countBrandMentions;
    private isModelSubstantiallyDiscussed;
    private isModelMentioned;
    private isSneakerContent;
    private getSystemPrompt;
    private buildExtractionPrompt;
    private normalizeSneakers;
    private isValidExtraction;
    private isCompleteRecord;
    private normalizeBrand;
    private normalizeModel;
    private normalizePlate;
    private normalizeWaterproof;
    private normalizePrice;
    private normalizeWeight;
    private normalizeHeight;
    private normalizeDrop;
    private normalizeUse;
    private normalizeSurface;
    private normalizeCushioning;
    private normalizeWidth;
    private normalizeBreathability;
}
//# sourceMappingURL=simple-parser.d.ts.map