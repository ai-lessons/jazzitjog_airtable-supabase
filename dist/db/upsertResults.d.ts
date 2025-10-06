import type { ShoeInput } from '../transform/fields';
export declare function upsertResults(rows: ShoeInput[], opts?: {
    dryRun?: boolean;
}): Promise<{
    written: number;
}>;
/** Совместимый батчевый апсерт (для старого кода) */
export declare function upsertResultsInBatches(rows: ShoeInput[], chunkSize?: number, opts?: {
    dryRun?: boolean;
}): Promise<{
    written: number;
}>;
//# sourceMappingURL=upsertResults.d.ts.map