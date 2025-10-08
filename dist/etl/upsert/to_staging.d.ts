import type { ShoeInput } from '../../core/types';
import type { UpsertResult, UpsertSummary } from './types';
import type { SupabaseClient } from '../../integrations/supabase/client';
/**
 * Insert a shoe into staging_table
 * Note: staging uses INSERT (not UPSERT) because each ETL run should create new staging entries
 */
export declare function insertToStaging(client: SupabaseClient, shoe: ShoeInput, airtableId: string): Promise<UpsertResult>;
/**
 * Insert multiple shoes into staging_table
 */
export declare function insertShoesToStaging(client: SupabaseClient, shoes: ShoeInput[], airtableId: string): Promise<UpsertSummary>;
/**
 * Send email notification about new staging items
 */
export declare function notifyNewStagingItems(count: number): Promise<void>;
//# sourceMappingURL=to_staging.d.ts.map