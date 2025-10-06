"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cfg = void 0;
exports.default = loadConfig;
// src/config/index.ts
require("dotenv/config");
const zod_1 = require("zod");
/** Читаем .env и валидируем */
const Env = zod_1.z.object({
    // Supabase
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string(),
    // Airtable
    AIRTABLE_API_KEY: zod_1.z.string(),
    AIRTABLE_BASE_ID: zod_1.z.string(),
    AIRTABLE_TABLE_NAME: zod_1.z.string().min(1),
    // OpenAI (необязательно, но если есть — ок)
    OPENAI_API_KEY: zod_1.z.string().optional(),
    // Параметры пайплайна (кастомные, с преобразованием к числам)
    SYNC_INTERVAL_MIN: zod_1.z.coerce.number().optional(),
    BATCH_SIZE: zod_1.z.coerce.number().optional(),
    MAX_PARALLEL_REQUESTS: zod_1.z.coerce.number().optional(),
});
const env = Env.parse(process.env);
/** Единый объект конфигурации */
exports.cfg = {
    supabase: {
        url: env.SUPABASE_URL,
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
    airtable: {
        apiKey: env.AIRTABLE_API_KEY,
        baseId: env.AIRTABLE_BASE_ID,
        tableName: env.AIRTABLE_TABLE_NAME,
    },
    openai: {
        apiKey: env.OPENAI_API_KEY ?? null,
    },
    pipeline: {
        syncIntervalMin: env.SYNC_INTERVAL_MIN ?? 60,
        batchSize: env.BATCH_SIZE ?? 50,
        maxParallelRequests: env.MAX_PARALLEL_REQUESTS ?? 3,
    },
};
function loadConfig() {
    return {
        openai: {
            apiKey: env.OPENAI_API_KEY || '',
            model: 'gpt-4o-mini',
            temperature: 0.1,
            maxTokens: 4000,
        }
    };
}
//# sourceMappingURL=index.js.map