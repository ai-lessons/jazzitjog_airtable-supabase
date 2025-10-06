"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
// src/db/client.ts
require("dotenv/config");
const supabase_js_1 = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
}
// Админ-клиент: только для серверной среды (локальный скрипт/бэкенд)
exports.supabaseAdmin = (0, supabase_js_1.createClient)(url, serviceKey, {
    auth: { persistSession: false },
});
//# sourceMappingURL=client.js.map