"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tightenInput = exports.normalizeAll = void 0;
exports.mapFromAirtable = mapFromAirtable;
// src/pipeline/mapFromAirtable.ts
const fields_1 = require("../transform/fields");
Object.defineProperty(exports, "normalizeAll", { enumerable: true, get: function () { return fields_1.normalizeAll; } });
Object.defineProperty(exports, "tightenInput", { enumerable: true, get: function () { return fields_1.tightenInput; } });
const fromAirtableToShoeInputs_1 = require("./fromAirtableToShoeInputs");
/**
 * Совместимая обёртка над новым маппером:
 * принимает airtable-записи, возвращает массив строгих ShoeInput.
 */
async function mapFromAirtable(records) {
    // новый конвертер уже возвращает ShoeInput[]
    const rows = await (0, fromAirtableToShoeInputs_1.fromAirtableToShoeInputs)(records);
    // на случай, если где-то старый код ожидает normalizeAll/tightenInput
    const loose = rows;
    const strict = (0, fields_1.normalizeAll)(loose);
    return strict;
}
//# sourceMappingURL=mapFromAirtable.js.map