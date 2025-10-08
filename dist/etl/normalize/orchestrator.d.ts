import type { SneakerSpec } from '../../llm/types';
import type { NormalizeResult } from './types';
/**
 * Normalize a single sneaker spec
 */
export declare function normalizeSneaker(sneaker: SneakerSpec, options?: {
    currency?: string | null;
}): NormalizeResult;
/**
 * Normalize multiple sneakers
 */
export declare function normalizeSneakers(sneakers: SneakerSpec[], options?: {
    currency?: string | null;
}): NormalizeResult[];
//# sourceMappingURL=orchestrator.d.ts.map