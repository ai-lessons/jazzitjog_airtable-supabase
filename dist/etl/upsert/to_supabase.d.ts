import type { ShoeInput } from '../../core/types';
import type { UpsertResult, UpsertSummary } from './types';
import type { SupabaseClient } from '../../integrations/supabase/client';
/**
 * Upsert a single shoe to database
 */
export declare function upsertShoe(client: SupabaseClient, shoe: ShoeInput): Promise<UpsertResult>;
/**
 * Upsert multiple shoes to database
 */
export declare function upsertShoes(client: SupabaseClient, shoes: ShoeInput[]): Promise<UpsertSummary>;
//# sourceMappingURL=to_supabase.d.ts.map