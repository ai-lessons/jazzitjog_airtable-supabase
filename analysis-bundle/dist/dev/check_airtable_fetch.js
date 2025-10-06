"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/dev/check_airtable_fetch.ts
const fetch_1 = require("../airtable/fetch");
(async () => {
    const rows = await (0, fetch_1.fetchAirtableRows)({ max: 5 });
    console.log('✅ Получено из Airtable:', rows.length);
    if (rows[0]) {
        console.log('Пример строки:', {
            id: rows[0].id,
            keys: Object.keys(rows[0].fields).slice(0, 8),
            createdTime: rows[0].createdTime,
        });
    }
})();
//# sourceMappingURL=check_airtable_fetch.js.map