import { z } from 'zod';

// Схема для входящих данных из Airtable
export const AirtableRecordSchema = z.object({
  id: z.string(),
  fields: z.object({
    ID: z.number(),
    Title: z.string(),
    Content: z.string(),
    'Article link': z.string().optional(),
    Published: z.string().optional(),
    'Time created': z.string().optional(),
  }),
});

// Схема для извлеченных данных о кроссовках
export const SneakerDataSchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  primary_use: z.enum([
    'daily_trainer', 'tempo', 'racing', 'trail', 'stability', 'max_cushion',
    'hiking', 'walking', 'trail_walking', 'water_sports', 'casual'
  ]).optional(),
  cushioning_type: z.enum(['soft', 'firm', 'responsive', 'max', 'minimal', 'balanced']).optional(),
  heel_height: z.number().min(10).max(70).optional(),
  forefoot_height: z.number().min(5).max(50).optional(),
  weight: z.number().min(100).max(700).optional(),
  foot_width: z.enum(['narrow', 'medium', 'wide', 'regular']).optional(),
  drop: z.number().min(-5).max(25).optional(),
  surface_type: z.enum(['road', 'trail', 'mixed', 'track', 'water', 'sand']).optional(),
  upper_breathability: z.enum(['breathable', 'mesh', 'knit', 'standard', 'engineered mesh', 'synthetic']).optional(),
  carbon_plate: z.enum(['yes', 'no', 'partial']).optional(),
  waterproof: z.enum(['goretex', 'waterproof', 'water_resistant', 'none']).optional(),
  price: z.number().min(30).max(600).optional(),
  additional_features: z.string().optional(),
});

// Схема для финальной записи в БД
export const FinalSneakerRecordSchema = SneakerDataSchema.extend({
  brand_name: z.string(),
  source_link: z.string().optional(),
  article_id: z.number(),
  date: z.string(),
  quality_level: z.number().min(1).max(5),
  validation_score: z.number(),
});

export type AirtableRecord = z.infer<typeof AirtableRecordSchema>;
export type SneakerData = z.infer<typeof SneakerDataSchema>;
export type FinalSneakerRecord = z.infer<typeof FinalSneakerRecordSchema>;