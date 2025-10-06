"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
exports.supabaseAdmin = (0, supabase_js_1.createClient)(config_1.cfg.supabase.url, config_1.cfg.supabase.serviceRoleKey, { auth: { persistSession: false } });
//# sourceMappingURL=supabase.js.map