"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/dev/upsert_from_airtable.ts
const fetch_1 = require("../airtable/fetch");
const mapFromAirtable_1 = require("../pipeline/mapFromAirtable");
const upsertResults_1 = require("../db/upsertResults");
(async () => {
    // возьмём 20 для теста; можно менять
    const raw = await (0, fetch_1.fetchAirtableRows)({ max: 20 });
    const mapped = raw.map(mapFromAirtable_1.mapFromAirtable).filter((x) => !!x);
    console.log("Всего получено из Airtable:", raw.length);
    console.log("Готово к записи (после маппинга):", mapped.length);
    if (!mapped.length) {
        console.log("Нет подходящих строк для записи. Проверьте поля URL/ID/Title в Airtable.");
        process.exit(0);
    }
    await (0, upsertResults_1.upsertResultsBatch)(mapped, 500);
    console.log("✅ Upsert в Supabase завершён:", mapped.length);
})();
//# sourceMappingURL=upsert_from_airtable.js.map