"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/dev/upsert_one_kailas.ts
require("dotenv/config");
const airtable_1 = __importDefault(require("airtable"));
const fromAirtableToShoeInputs_1 = require("../pipeline/fromAirtableToShoeInputs");
const upsertResults_1 = require("../db/upsertResults");
async function main() {
    const recId = 'recR9MMIHkbs1LkYm'; // Kailas FUGA EX 330
    const base = new airtable_1.default({ apiKey: process.env.AIRTABLE_API_KEY })
        .base(process.env.AIRTABLE_BASE_ID);
    const tableName = process.env.AIRTABLE_TABLE_NAME;
    const record = await base(tableName).find(recId);
    const inputs = await (0, fromAirtableToShoeInputs_1.fromAirtableToShoeInputs)([record]);
    if (!inputs.length) {
        console.error('❌ Нет валидных моделей из fromAirtableToShoeInputs для', recId);
        process.exit(1);
    }
    console.log('📦 Готовим UPSERT:', inputs);
    const res = await (0, upsertResults_1.upsertResults)(inputs);
    console.log('✅ upsertResults завершён:', res ?? 'ok');
}
main().catch(err => {
    console.error('❌ Ошибка:', err);
    process.exit(1);
});
//# sourceMappingURL=upsert_one_kailas.js.map