"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/dev/upsert_by_record_ids.ts
require("dotenv/config");
const airtable_1 = __importDefault(require("airtable"));
const fromAirtableToShoeInputs_1 = require("../pipeline/fromAirtableToShoeInputs");
const upsertResults_1 = require("../db/upsertResults");
const base = new airtable_1.default({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_BASE_ID);
const tableName = process.env.AIRTABLE_TABLE_NAME;
function uniqBy(arr, key) {
    const seen = new Set();
    const out = [];
    for (const x of arr) {
        const k = key(x);
        if (!seen.has(k)) {
            seen.add(k);
            out.push(x);
        }
    }
    return out;
}
async function run(ids) {
    if (!ids.length) {
        console.error('Usage: npx tsx src/dev/upsert_by_record_ids.ts <airtable_rec_id> [...]');
        process.exit(1);
    }
    // тянем записи из Airtable по их record_id
    const recs = await Promise.all(ids.map(async (id) => {
        try {
            return await base(tableName).find(id);
        }
        catch (e) {
            console.error(`⚠️  Не найдено в Airtable: ${id} (${e?.message || e})`);
            return null;
        }
    }));
    const found = recs.filter(Boolean);
    if (found.length === 0) {
        console.error('❌ Нет валидных записей для апсерта.');
        process.exit(1);
    }
    // конвертируем в ShoeInput
    const inputs = await (0, fromAirtableToShoeInputs_1.fromAirtableToShoeInputs)(found);
    if (!inputs.length) {
        console.error('❌ Конвертер вернул 0 моделей.');
        process.exit(1);
    }
    // на всякий случай — уникализируем по (record_id, model_key)
    const dedup = uniqBy(inputs, (x) => `${x.record_id}::${x.model_key}`);
    // валидация обязательных полей
    for (const r of dedup) {
        if (!r.record_id)
            throw new Error('record_id is required');
        if (!r.model_key)
            throw new Error('model_key is required');
    }
    console.log('📦 Готовим UPSERT:', dedup.map((r) => ({
        record_id: r.record_id, brand: r.brand_name, model: r.model, model_key: r.model_key, price: r.price
    })));
    const res = await (0, upsertResults_1.upsertResults)(dedup);
    console.log('✅ upserted:', res);
}
// CLI: ids из аргументов
const ids = process.argv.slice(2).map(s => s.trim()).filter(Boolean);
run(ids).catch(e => { console.error('❌ Ошибка:', e); process.exit(1); });
//# sourceMappingURL=upsert_by_record_ids.js.map