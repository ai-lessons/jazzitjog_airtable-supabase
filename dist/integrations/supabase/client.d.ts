import type { SupabaseClientType, DatabaseConfig } from './types';
export type { SupabaseClientType, DatabaseConfig } from './types';
export type SupabaseClient = SupabaseClientType;
/**
 * Create Supabase admin client (server-side only)
 */
export declare function createSupabaseClient(config: DatabaseConfig): SupabaseClientType;
/**
 * Get or create cached Supabase client
 */
export declare function getSupabaseClient(config: DatabaseConfig): SupabaseClientType;
/**
 * Reset cached client (useful for testing)
 */
export declare function resetSupabaseClient(): void;
//# sourceMappingURL=client.d.ts.map