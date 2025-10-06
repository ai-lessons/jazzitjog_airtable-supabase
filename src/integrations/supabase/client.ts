// Supabase integration client
// Migrated from: src/db/client.ts + src/db/supabase.ts

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClientType, DatabaseConfig } from './types';
import { logger } from '../../core/logger';

// Re-export types for convenience
export type { SupabaseClientType, DatabaseConfig } from './types';
export type SupabaseClient = SupabaseClientType;

let cachedClient: SupabaseClientType | null = null;

/**
 * Create Supabase admin client (server-side only)
 */
export function createSupabaseClient(config: DatabaseConfig): SupabaseClientType {
  logger.debug('Creating Supabase client', { url: config.url });

  const client = createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  logger.info('Supabase client created successfully');
  return client;
}

/**
 * Get or create cached Supabase client
 */
export function getSupabaseClient(config: DatabaseConfig): SupabaseClientType {
  if (!cachedClient) {
    cachedClient = createSupabaseClient(config);
  }
  return cachedClient;
}

/**
 * Reset cached client (useful for testing)
 */
export function resetSupabaseClient(): void {
  cachedClient = null;
  logger.debug('Supabase client cache cleared');
}
