"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
console.log('✅ Supabase URL:', config_1.cfg.supabase.url);
console.log('✅ Supabase key prefix:', config_1.cfg.supabase.serviceRoleKey.slice(0, 12) + '…');
console.log('✅ Airtable base:', config_1.cfg.airtable.baseId);
console.log('✅ Airtable table:', config_1.cfg.airtable.tableName);
console.log('✅ OpenAI set?:', !!config_1.cfg.openai.apiKey);
console.log('✅ Pipeline settings:', config_1.cfg.pipeline);
console.log('OK: конфигурация загружена.');
//# sourceMappingURL=check_config.js.map