import type { SupabaseClientType } from './types';
/**
 * Execute raw SQL via RPC (requires exec_sql function in Supabase)
 */
export declare function execSql(client: SupabaseClientType, sql: string): Promise<any>;
/**
 * Search sneakers via RPC (requires search_sneakers function in Supabase)
 */
export declare function searchSneakers(client: SupabaseClientType, query: string, options?: {
    limit?: number;
}): Promise<any[]>;
/**
 * Get database statistics via RPC
 */
export declare function getDbStats(client: SupabaseClientType): Promise<any>;
//# sourceMappingURL=rpc.d.ts.map