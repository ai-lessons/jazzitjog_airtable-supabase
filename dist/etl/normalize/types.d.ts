import type { SneakerSpec } from '../../llm/types';
/**
 * Result of normalization
 */
export type NormalizeResult = {
    sneaker: SneakerSpec;
    changes: NormalizationChange[];
    warnings: string[];
};
/**
 * Record of what changed during normalization
 */
export type NormalizationChange = {
    field: string;
    before: any;
    after: any;
    reason: string;
};
//# sourceMappingURL=types.d.ts.map