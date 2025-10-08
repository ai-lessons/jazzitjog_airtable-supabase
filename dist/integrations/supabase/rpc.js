"use strict";
// Supabase RPC calls
// Utilities for calling stored procedures and custom SQL
Object.defineProperty(exports, "__esModule", { value: true });
exports.execSql = execSql;
exports.searchSneakers = searchSneakers;
exports.getDbStats = getDbStats;
const logger_1 = require("../../core/logger");
/**
 * Execute raw SQL via RPC (requires exec_sql function in Supabase)
 */
async function execSql(client, sql) {
    logger_1.logger.debug('Executing SQL via RPC', { sql: sql.substring(0, 100) });
    try {
        const { data, error } = await client.rpc('exec_sql', { sql });
        if (error) {
            logger_1.logger.error('RPC exec_sql failed', { error, sql: sql.substring(0, 100) });
            throw error;
        }
        logger_1.logger.debug('SQL executed successfully');
        return data;
    }
    catch (error) {
        logger_1.logger.error('Failed to execute SQL', { error });
        throw error;
    }
}
/**
 * Search sneakers via RPC (requires search_sneakers function in Supabase)
 */
async function searchSneakers(client, query, options) {
    logger_1.logger.debug('Searching sneakers via RPC', { query, limit: options?.limit });
    try {
        const { data, error } = await client.rpc('search_sneakers', {
            search_query: query,
            result_limit: options?.limit || 10,
        });
        if (error) {
            logger_1.logger.error('RPC search_sneakers failed', { error, query });
            throw error;
        }
        logger_1.logger.info('Search completed', { query, results: data?.length || 0 });
        return data || [];
    }
    catch (error) {
        logger_1.logger.error('Failed to search sneakers', { error });
        throw error;
    }
}
/**
 * Get database statistics via RPC
 */
async function getDbStats(client) {
    logger_1.logger.debug('Fetching database statistics');
    try {
        const { data, error } = await client.rpc('get_db_stats');
        if (error) {
            logger_1.logger.error('RPC get_db_stats failed', { error });
            throw error;
        }
        logger_1.logger.info('Database statistics retrieved', { stats: data });
        return data;
    }
    catch (error) {
        logger_1.logger.error('Failed to get database statistics', { error });
        throw error;
    }
}
//# sourceMappingURL=rpc.js.map