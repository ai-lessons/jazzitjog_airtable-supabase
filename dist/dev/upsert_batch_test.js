"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/dev/upsert_batch_test.ts
require("dotenv/config");
const saveToSupabase_1 = __importDefault(require("../pipeline/saveToSupabase"));
const fields_1 = require("../transform/fields");
async function main() {
    // пример тестовых данных (loose)
    const sample = [
        {
            article_id: 999,
            record_id: 'rec_test_1',
            brand_name: 'TestBrand',
            model: 'Model X',
            price: 199,
            weight: 250,
            primary_use: 'road',
            surface_type: 'road',
            date: new Date().toISOString(),
            source_link: 'https://example.com'
        }
    ];
    // приведём к строгому виду
    const strict = sample.map(s => (0, fields_1.tightenInput)(s)).filter(Boolean);
    const res = await (0, saveToSupabase_1.default)(strict);
    console.log('upsert_batch_test result:', res);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=upsert_batch_test.js.map