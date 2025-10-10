"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleDatabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class SimpleDatabase {
    supabase;
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    async saveSneakers(article_id, airtable_id, sneakers) {
        const results = { success: 0, errors: [] };
        for (const sneaker of sneakers) {
            try {
                const record = this.sneakerToRecord(article_id, airtable_id, sneaker);
                await this.upsertRecord(record);
                results.success++;
            }
            catch (error) {
                results.errors.push(`${sneaker.brand} ${sneaker.model}: ${error}`);
            }
        }
        return results;
    }
    sneakerToRecord(article_id, airtable_id, sneaker) {
        const model_key = this.makeModelKey(sneaker.brand, sneaker.model);
        return {
            article_id,
            airtable_id,
            brand_name: sneaker.brand,
            model: sneaker.model,
            model_key,
            primary_use: sneaker.use,
            surface_type: sneaker.surface,
            heel_height: sneaker.heel,
            forefoot_height: sneaker.forefoot,
            drop: sneaker.drop,
            weight: sneaker.weight,
            price: sneaker.price,
            carbon_plate: sneaker.plate,
            waterproof: sneaker.waterproof,
            cushioning_type: sneaker.cushioning,
            foot_width: sneaker.width,
            upper_breathability: sneaker.breathability,
            date: sneaker.date,
            source_link: sneaker.source,
        };
    }
    makeModelKey(brand, model) {
        const normalize = (s) => s.toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()
            .replace(/\s+/g, ' ');
        const b = normalize(brand);
        const m = normalize(model);
        return `${b}::${m}`;
    }
    async upsertRecord(record) {
        // Check if record exists
        const existing = await this.findExisting(record.airtable_id, record.model_key);
        if (existing) {
            // Update with richer data
            const merged = this.mergeRecords(existing, record);
            const { error } = await this.supabase
                .from('shoe_results')
                .update(merged)
                .eq('id', existing.id);
            if (error) {
                throw new Error(`Update failed: ${error.message}`);
            }
        }
        else {
            // Insert new record
            const { error } = await this.supabase
                .from('shoe_results')
                .insert([record]);
            if (error) {
                throw new Error(`Insert failed: ${error.message}`);
            }
        }
    }
    async findExisting(airtable_id, model_key) {
        const { data, error } = await this.supabase
            .from('shoe_results')
            .select('*')
            .eq('airtable_id', airtable_id)
            .eq('model_key', model_key)
            .single();
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            throw new Error(`Query failed: ${error.message}`);
        }
        return data || null;
    }
    mergeRecords(existing, newRecord) {
        const merged = { ...existing };
        // Update with non-null values from new record
        Object.keys(newRecord).forEach(key => {
            const newValue = newRecord[key];
            const existingValue = existing[key];
            // Update if new value is not null/undefined and existing is null/undefined
            if (newValue !== null && newValue !== undefined) {
                if (existingValue === null || existingValue === undefined) {
                    merged[key] = newValue;
                }
            }
        });
        merged.updated_at = new Date().toISOString();
        return merged;
    }
    async getStats() {
        const { count: totalCount } = await this.supabase
            .from('shoe_results')
            .select('*', { count: 'exact', head: true });
        const { data: brandsData } = await this.supabase
            .from('shoe_results')
            .select('brand_name, model_key');
        const uniqueBrands = [...new Set((brandsData || []).map(r => r.brand_name))];
        const uniqueModels = [...new Set((brandsData || []).map(r => r.model_key))];
        return {
            total_records: totalCount || 0,
            unique_models: uniqueModels.length,
            brands: uniqueBrands,
        };
    }
    async clearAll() {
        try {
            // First get the count
            const { count } = await this.supabase
                .from('shoe_results')
                .select('*', { count: 'exact', head: true });
            // Delete all records
            const { error } = await this.supabase
                .from('shoe_results')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
            if (error) {
                return {
                    success: false,
                    deleted_count: 0,
                    error: error.message
                };
            }
            return {
                success: true,
                deleted_count: count || 0
            };
        }
        catch (error) {
            return {
                success: false,
                deleted_count: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.SimpleDatabase = SimpleDatabase;
//# sourceMappingURL=simple-db.js.map