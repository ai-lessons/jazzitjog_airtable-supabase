"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveToSupabase = saveToSupabase;
// src/pipeline/saveToSupabase.ts
const upsertResults_1 = require("../db/upsertResults");
const sneakerValidation_1 = require("../utils/sneakerValidation");
/** Нормализация и приведение типов под схему таблицы */
function toShoeResult(raw) {
    const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
    const bool = (v) => (v === null || v === undefined || v === '' ? null : Boolean(v));
    const str = (v) => (v === null || v === undefined ? null : String(v).trim());
    return {
        brand_name: String(raw.brand_name ?? raw.brand ?? '').trim(),
        model: String(raw.model ?? '').trim(),
        primary_use: str(raw.primary_use),
        cushioning_type: str(raw.cushioning_type),
        heel_height: num(raw.heel_height),
        forefoot_height: num(raw.forefoot_height),
        weight: num(raw.weight),
        foot_width: str(raw.foot_width),
        drop: num(raw.drop),
        surface_type: str(raw.surface_type),
        upper_breathability: num(raw.upper_breathability),
        carbon_plate: raw.carbon_plate === undefined ? null : bool(raw.carbon_plate),
        waterproof: raw.waterproof === undefined ? null : bool(raw.waterproof),
        price: num(raw.price),
        additional_features: str(raw.additional_features),
        source_link: String(raw.source_link ?? raw.url ?? '').trim(),
        article_id: String(raw.article_id ?? raw.id ?? '').trim(),
        // ожидается формат 'YYYY-MM-DD'; если у вас ISO — возьмём первые 10 символов
        date: raw.date ? String(raw.date).slice(0, 10) : null,
    };
}
/** Публичная функция: передайте сюда массив ваших итоговых записей */
async function saveToSupabase(finalRows) {
    // фильтруем мусор: без brand_name/model/source_link/article_id в базу не пишем
    // + ЖЕСТКОЕ ПРАВИЛО: только кроссовки
    const cleaned = finalRows
        .map(toShoeResult)
        .filter(r => {
        // Базовая валидация
        if (!r.brand_name || !r.model || !r.source_link || !r.article_id) {
            return false;
        }
        // Проверяем, что это кроссовки
        if (!(0, sneakerValidation_1.shouldIncludeInSneakerDB)(r.brand_name, r.model)) {
            console.log(`❌ Отклонена при сохранении: не кроссовки - ${r.brand_name} ${r.model}`);
            return false;
        }
        return true;
    });
    if (!cleaned.length) {
        console.log('saveToSupabase: nothing to save');
        return;
    }
    // Use new deduplication logic
    const results = await (0, upsertResults_1.upsertWithDeduplication)(cleaned);
    console.log(`saveToSupabase: processed ${cleaned.length} rows - inserted: ${results?.inserted || 0}, updated: ${results?.updated || 0}, skipped: ${results?.skipped || 0}`);
    return results;
}
//# sourceMappingURL=saveToSupabase.js.map