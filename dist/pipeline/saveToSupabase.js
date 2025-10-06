"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = saveToSupabase;
// src/pipeline/saveToSupabase.ts
const upsertResults_1 = require("../db/upsertResults");
const fields_1 = require("../transform/fields");
async function saveToSupabase(rows) {
    // если прилетели «loose»-объекты — приведём
    const strictRows = (0, fields_1.normalizeAll)(rows);
    if (!strictRows.length)
        return { written: 0 };
    const dryRun = process.env.DRY_RUN === '1';
    const res = await (0, upsertResults_1.upsertResultsInBatches)(strictRows, 500, { dryRun });
    return res;
}
//# sourceMappingURL=saveToSupabase.js.map