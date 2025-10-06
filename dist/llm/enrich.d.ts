import { SneakerData } from '@/validate/schema';
import { Config } from '@/config';
export declare class SneakerEnricher {
    private client;
    private config;
    private stats;
    private excludedBrands;
    constructor(config: Config['openai']);
    enrichArticle(articleId: number, title: string, content: string, articleUrl?: string): Promise<SneakerData[]>;
    private preprocessText;
    private extractComparisons;
    private createPrompt;
    private parseJsonResponse;
    private validateAndCleanData;
    private cleanItemData;
    private updateStats;
    getStats(): {
        totalCost: number;
        totalInputTokens: number;
        totalOutputTokens: number;
        successfulExtractions: number;
        failedExtractions: number;
    };
    resetStats(): void;
}
//# sourceMappingURL=enrich.d.ts.map