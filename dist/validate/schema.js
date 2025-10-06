"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinalSneakerRecordSchema = exports.SneakerDataSchema = exports.AirtableRecordSchema = void 0;
const zod_1 = require("zod");
// Схема для входящих данных из Airtable
exports.AirtableRecordSchema = zod_1.z.object({
    id: zod_1.z.string(),
    fields: zod_1.z.object({
        ID: zod_1.z.number(),
        Title: zod_1.z.string(),
        Content: zod_1.z.string(),
        'Article link': zod_1.z.string().optional(),
        Published: zod_1.z.string().optional(),
        'Time created': zod_1.z.string().optional(),
    }),
});
// Схема для извлеченных данных о кроссовках
exports.SneakerDataSchema = zod_1.z.object({
    brand: zod_1.z.string().min(1),
    model: zod_1.z.string().min(1),
    primary_use: zod_1.z.enum([
        'daily_trainer', 'tempo', 'racing', 'trail', 'stability', 'max_cushion',
        'hiking', 'walking', 'trail_walking', 'water_sports', 'casual'
    ]).optional(),
    cushioning_type: zod_1.z.enum(['soft', 'firm', 'responsive', 'max', 'minimal', 'balanced']).optional(),
    heel_height: zod_1.z.number().min(10).max(70).optional(),
    forefoot_height: zod_1.z.number().min(5).max(50).optional(),
    weight: zod_1.z.number().min(100).max(700).optional(),
    foot_width: zod_1.z.enum(['narrow', 'medium', 'wide', 'regular']).optional(),
    drop: zod_1.z.number().min(-5).max(25).optional(),
    surface_type: zod_1.z.enum(['road', 'trail', 'mixed', 'track', 'water', 'sand']).optional(),
    upper_breathability: zod_1.z.enum(['breathable', 'mesh', 'knit', 'standard', 'engineered mesh', 'synthetic']).optional(),
    carbon_plate: zod_1.z.enum(['yes', 'no', 'partial']).optional(),
    waterproof: zod_1.z.enum(['goretex', 'waterproof', 'water_resistant', 'none']).optional(),
    price: zod_1.z.number().min(30).max(600).optional(),
    additional_features: zod_1.z.string().optional(),
});
// Схема для финальной записи в БД
exports.FinalSneakerRecordSchema = exports.SneakerDataSchema.extend({
    brand_name: zod_1.z.string(),
    source_link: zod_1.z.string().optional(),
    article_id: zod_1.z.number(),
    date: zod_1.z.string(),
    quality_level: zod_1.z.number().min(1).max(5),
    validation_score: zod_1.z.number(),
});
//# sourceMappingURL=schema.js.map