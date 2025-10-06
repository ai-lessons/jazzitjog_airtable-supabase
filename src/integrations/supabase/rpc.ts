// Supabase RPC calls
// Utilities for calling stored procedures and custom SQL

import type { SupabaseClientType } from './types';
import { logger } from '../../core/logger';

/**
 * Execute raw SQL via RPC (requires exec_sql function in Supabase)
 */
export async function execSql(client: SupabaseClientType, sql: string): Promise<any> {
  logger.debug('Executing SQL via RPC', { sql: sql.substring(0, 100) });

  try {
    const { data, error } = await client.rpc('exec_sql', { sql });

    if (error) {
      logger.error('RPC exec_sql failed', { error, sql: sql.substring(0, 100) });
      throw error;
    }

    logger.debug('SQL executed successfully');
    return data;
  } catch (error) {
    logger.error('Failed to execute SQL', { error });
    throw error;
  }
}

/**
 * Search sneakers via RPC (requires search_sneakers function in Supabase)
 */
export async function searchSneakers(
  client: SupabaseClientType,
  query: string,
  options?: { limit?: number }
): Promise<any[]> {
  logger.debug('Searching sneakers via RPC', { query, limit: options?.limit });

  try {
    const { data, error } = await client.rpc('search_sneakers', {
      search_query: query,
      result_limit: options?.limit || 10,
    });

    if (error) {
      logger.error('RPC search_sneakers failed', { error, query });
      throw error;
    }

    logger.info('Search completed', { query, results: data?.length || 0 });
    return data || [];
  } catch (error) {
    logger.error('Failed to search sneakers', { error });
    throw error;
  }
}

/**
 * Get database statistics via RPC
 */
export async function getDbStats(client: SupabaseClientType): Promise<any> {
  logger.debug('Fetching database statistics');

  try {
    const { data, error } = await client.rpc('get_db_stats');

    if (error) {
      logger.error('RPC get_db_stats failed', { error });
      throw error;
    }

    logger.info('Database statistics retrieved', { stats: data });
    return data;
  } catch (error) {
    logger.error('Failed to get database statistics', { error });
    throw error;
  }
}
