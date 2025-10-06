"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRejected = logRejected;
// src/db/rejected.ts
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function logRejected(r) {
    try {
        await supabase.from('shoe_results_rejected').insert([{
                record_id: r.record_id ?? null,
                model_key: r.model_key ?? null,
                brand_name: r.brand_name ?? null,
                model: r.model ?? null,
                reason: r.reason,
                source_link: r.source_link ?? null,
                title: r.title ?? null,
            }]).select('id');
    }
    catch (e) {
        // не роняем ETL из-за логгера
        console.warn('logRejected failed:', e?.message || e);
    }
}
//# sourceMappingURL=rejected.js.map