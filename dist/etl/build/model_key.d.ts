/**
 * Generate model_key from brand and model
 * Format: "brand model" in normalized lowercase (space-separated)
 *
 * Examples:
 * - Nike Vaporfly 3 → "nike vaporfly 3"
 * - Hoka Speedgoat 5 → "hoka speedgoat 5"
 * - Adidas Adizero Pro 3 → "adidas adizero pro 3"
 *
 * Note: Uses space separator to match existing shoe_results table format
 */
export declare function generateModelKey(brand: string | null, model: string | null): string;
//# sourceMappingURL=model_key.d.ts.map