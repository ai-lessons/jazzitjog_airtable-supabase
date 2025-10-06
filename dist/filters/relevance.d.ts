export type Irrelevance = {
    ok: true;
} | {
    ok: false;
    reason: 'listicle' | 'apparel' | 'nonshoe' | 'badbrand' | 'badmodel';
};
export declare function detectIrrelevant(title: string, modelKey: string, model: string, brand?: string): Irrelevance;
//# sourceMappingURL=relevance.d.ts.map