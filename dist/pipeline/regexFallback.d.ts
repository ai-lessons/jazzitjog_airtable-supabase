type Heights = {
    heel?: number | null;
    forefoot?: number | null;
    drop?: number | null;
};
type PriceOut = {
    priceUsd?: number | null;
    currency?: string | null;
    raw?: number | null;
};
export declare function parseHeights(textRaw: string): Heights;
export declare function parseWeight(textRaw: string): number | null;
export declare function parsePriceToUSD(textRaw: string): PriceOut;
export {};
//# sourceMappingURL=regexFallback.d.ts.map