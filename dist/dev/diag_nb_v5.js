"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const airtable_1 = __importDefault(require("airtable"));
const brandModelFromTitle_1 = require("../transform/brandModelFromTitle");
const fromAirtableToShoeInputs_1 = require("../pipeline/fromAirtableToShoeInputs");
const base = new airtable_1.default({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_BASE_ID);
const tableName = process.env.AIRTABLE_TABLE_NAME;
async function run() {
    const recId = 'recv3AzbI18TYRfFi'; // из твоей строки CSV
    const r = await base(tableName).find(recId);
    const title = String(r.fields?.Title ?? '');
    const bm = (0, brandModelFromTitle_1.brandModelFromTitle)(title);
    console.log({ title, title_brand: bm.brand, title_model: bm.model });
    const inputs = await (0, fromAirtableToShoeInputs_1.fromAirtableToShoeInputs)([r]);
    console.log('models:', inputs.map(x => ({ brand: x.brand_name, model: x.model, model_key: x.model_key })));
}
run().catch(e => { console.error(e); process.exit(1); });
//# sourceMappingURL=diag_nb_v5.js.map