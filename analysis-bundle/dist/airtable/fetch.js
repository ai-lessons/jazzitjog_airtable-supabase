"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAirtableRows = fetchAirtableRows;
// src/airtable/fetch.ts
const airtable_1 = __importDefault(require("airtable"));
const config_1 = require("../config");
async function fetchAirtableRows(options) {
    const view = options?.view || 'Grid view';
    const max = options?.max || 100;
    const base = new airtable_1.default({ apiKey: config_1.cfg.airtable.apiKey }).base(config_1.cfg.airtable.baseId);
    const table = base(config_1.cfg.airtable.tableName);
    const rows = [];
    await new Promise((resolve, reject) => {
        table
            .select({ view, pageSize: 100, maxRecords: max })
            .eachPage((records, next) => {
            for (const r of records) {
                rows.push({
                    id: r.id,
                    fields: r.fields,
                    createdTime: r._rawJson.createdTime,
                });
            }
            next();
        }, (err) => (err ? reject(err) : resolve()));
    });
    return rows;
}
//# sourceMappingURL=fetch.js.map