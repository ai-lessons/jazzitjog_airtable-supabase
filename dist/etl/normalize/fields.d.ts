import type { NormalizationChange } from './types';
/**
 * Normalize brand name
 */
export declare function normalizeBrandName(brand: string | null, changes: NormalizationChange[]): string | null;
/**
 * Normalize model name
 */
export declare function normalizeModelName(model: string | null, changes: NormalizationChange[]): string | null;
/**
 * Normalize height (heel/forefoot)
 */
export declare function normalizeHeight(height: number | null, fieldName: 'heel_height' | 'forefoot_height', changes: NormalizationChange[], warnings: string[]): number | null;
/**
 * Normalize drop
 */
export declare function normalizeDrop(drop: number | null, heelHeight: number | null, foreFootHeight: number | null, changes: NormalizationChange[], warnings: string[]): number | null;
/**
 * Normalize weight
 */
export declare function normalizeWeight(weight: number | null, changes: NormalizationChange[], warnings: string[]): number | null;
/**
 * Normalize price
 */
export declare function normalizePrice(price: number | null, currency: string | null, changes: NormalizationChange[], warnings: string[]): number | null;
/**
 * Normalize enum field
 */
export declare function normalizeEnum<T extends string>(value: T | null, allowedValues: readonly T[], fieldName: string, changes: NormalizationChange[], warnings: string[]): T | null;
/**
 * Normalize boolean field
 */
export declare function normalizeBoolean(value: boolean | null, fieldName: string, changes: NormalizationChange[]): boolean | null;
//# sourceMappingURL=fields.d.ts.map