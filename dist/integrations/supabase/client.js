"use strict";
// Supabase integration client
// Migrated from: src/db/client.ts + src/db/supabase.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseClient = createSupabaseClient;
exports.getSupabaseClient = getSupabaseClient;
exports.resetSupabaseClient = resetSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../../core/logger");
let cachedClient = null;
/**
 * Create Supabase admin client (server-side only)
 */
function createSupabaseClient(config) {
    logger_1.logger.debug('Creating Supabase client', { url: config.url });
    const client = (0, supabase_js_1.createClient)(config.url, config.serviceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
    logger_1.logger.info('Supabase client created successfully');
    return client;
}
/**
 * Get or create cached Supabase client
 */
function getSupabaseClient(config) {
    if (!cachedClient) {
        cachedClient = createSupabaseClient(config);
    }
    return cachedClient;
}
/**
 * Reset cached client (useful for testing)
 */
function resetSupabaseClient() {
    cachedClient = null;
    logger_1.logger.debug('Supabase client cache cleared');
}
//# sourceMappingURL=client.js.map