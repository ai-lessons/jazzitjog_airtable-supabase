"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWatermark = getWatermark;
exports.setWatermark = setWatermark;
exports.resetWatermark = resetWatermark;
// src/db/watermark.ts
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const KEY = 'sneaker_pipeline.watermark';
async function getWatermark() {
    const { data, error } = await supabase
        .from('etl_state')
        .select('value')
        .eq('key', KEY)
        .maybeSingle();
    if (error)
        throw error;
    const v = data?.value || {};
    return {
        last_airtable_created_at: v.last_airtable_created_at || '1970-01-01T00:00:00.000Z',
        last_run_at: v.last_run_at || null,
        counters: v.counters || {},
    };
}
async function setWatermark(next) {
    const value = {
        last_airtable_created_at: next.last_airtable_created_at,
        last_run_at: new Date().toISOString(),
        counters: next.counters || {},
    };
    const { error } = await supabase
        .from('etl_state')
        .upsert([{ key: KEY, value }], { onConflict: 'key' });
    if (error)
        throw error;
}
async function resetWatermark() {
    const { error } = await supabase
        .from('etl_state')
        .upsert([{ key: KEY, value: {
                last_airtable_created_at: '1970-01-01T00:00:00.000Z',
                last_run_at: new Date().toISOString(),
                counters: {}
            } }], { onConflict: 'key' });
    if (error)
        throw error;
}
//# sourceMappingURL=watermark.js.map