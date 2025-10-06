// src/config/index.ts
import 'dotenv/config';
import { z } from 'zod';

/** Читаем .env и валидируем */
const Env = z.object({
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // Airtable
  AIRTABLE_API_KEY: z.string(),
  AIRTABLE_BASE_ID: z.string(),
  AIRTABLE_TABLE_NAME: z.string().min(1),

  // OpenAI (необязательно, но если есть — ок)
  OPENAI_API_KEY: z.string().optional(),

  // Параметры пайплайна (кастомные, с преобразованием к числам)
  SYNC_INTERVAL_MIN: z.coerce.number().optional(),
  BATCH_SIZE: z.coerce.number().optional(),
  MAX_PARALLEL_REQUESTS: z.coerce.number().optional(),
});

const env = Env.parse(process.env);

/** Единый объект конфигурации */
export const cfg = {
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
} as const;

export type AppConfig = typeof cfg;

export function loadConfig() { return cfg; }
export default cfg;
