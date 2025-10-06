"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const airtable_1 = __importDefault(require("airtable"));
const config_1 = require("../config");
const base = new airtable_1.default({ apiKey: config_1.cfg.airtable.apiKey }).base(config_1.cfg.airtable.baseId);
const tableName = config_1.cfg.airtable.tableName;
(async () => {
    try {
        const records = await base(tableName).select({ maxRecords: 1 }).all();
        console.log(`✅ Airtable OK. Таблица "${tableName}", записей получено:`, records.length);
    }
    catch (e) {
        console.error('❌ Ошибка подключения к Airtable:', e?.statusCode || '', e?.message || e);
        console.error('Подсказки: проверьте токен (scopes), Base ID и точное имя таблицы.');
        process.exit(1);
    }
})();
//# sourceMappingURL=test_airtable_token.js.map