"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const csv_parse_1 = require("csv-parse");
const supabase_1 = require("../db/supabase");
function parseNumber(value) {
    if (!value || value === 'N/A')
        return null;
    // Handle special formats like "9.9 oz (282g)" - extract the grams value
    const gramsMatch = value.match(/\((\d+(?:\.\d+)?)g?\)/);
    if (gramsMatch) {
        const num = parseFloat(gramsMatch[1]);
        return isNaN(num) ? null : Math.round(num);
    }
    const cleaned = value.replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : Math.round(num);
}
function parseBoolean(value) {
    if (!value || value === 'N/A')
        return null;
    return value.toLowerCase() === 'yes';
}
function parsePlate(value) {
    if (!value || value === 'N/A' || value === 'no')
        return null;
    return value.toLowerCase() !== 'no';
}
function parseBreathability(value) {
    if (!value || value === 'N/A')
        return null;
    const lower = value.toLowerCase();
    if (lower === 'low')
        return 'low';
    if (lower === 'medium')
        return 'medium';
    if (lower === 'high')
        return 'high';
    return null;
}
function parseCushioning(value) {
    if (!value || value === 'N/A')
        return null;
    const lower = value.toLowerCase();
    // Map various cushioning types to our categories
    if (lower.includes('firm') || lower.includes('minimal'))
        return 'firm';
    if (lower.includes('balanced') || lower.includes('moderate') || lower.includes('average') || lower.includes('responsive'))
        return 'balanced';
    if (lower.includes('max') || lower.includes('plush') || lower.includes('soft') || lower.includes('cushioned'))
        return 'max';
    return null;
}
function parseWidth(value) {
    if (!value || value === 'N/A')
        return null;
    const lower = value.toLowerCase();
    if (lower === 'narrow')
        return 'narrow';
    if (lower === 'normal')
        return 'standard';
    if (lower === 'wide')
        return 'wide';
    return null;
}
function parseSurface(value) {
    if (!value || value === 'N/A')
        return null;
    const lower = value.toLowerCase();
    if (lower === 'road')
        return 'road';
    if (lower === 'trail')
        return 'trail';
    return null;
}
function createArticleId(brand, model) {
    if (!brand || !model)
        return '';
    return `${brand.toLowerCase().replace(/\s+/g, '-')}_${model.toLowerCase().replace(/\s+/g, '-')}`;
}
function createModelKey(brand, model) {
    if (!brand || !model)
        return '';
    return `${brand.toLowerCase()}::${model.toLowerCase()}`;
}
async function importData() {
    const records = [];
    const csvPath = 'H:\\sneaker-pipeline\\docs\\runrepeat_data.csv';
    const parser = (0, fs_1.createReadStream)(csvPath).pipe((0, csv_parse_1.parse)({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true, // Handle UTF-8 BOM
    }));
    for await (const row of parser) {
        // Skip rows with missing brand or model
        if (!row.brand || !row.model) {
            console.log('Skipping row with missing brand/model:', row);
            continue;
        }
        const shoeInput = {
            article_id: createArticleId(row.brand, row.model),
            airtable_id: null,
            brand_name: row.brand,
            model: row.model,
            model_key: createModelKey(row.brand, row.model),
            // Physical specs
            heel_height: parseNumber(row.heel),
            forefoot_height: parseNumber(row.forefoot),
            drop: parseNumber(row.drop),
            weight: parseNumber(row.weight),
            price: parseNumber(row.price),
            // Features
            upper_breathability: parseBreathability(row.breathability),
            carbon_plate: parsePlate(row.plate),
            waterproof: parseBoolean(row.waterproof),
            // Usage
            primary_use: row.use || null,
            cushioning_type: parseCushioning(row.cushioning),
            surface_type: parseSurface(row.surface),
            foot_width: parseWidth(row.width),
            // Metadata
            additional_features: row.plate !== 'no' && row.plate !== 'N/A' ? `plate: ${row.plate}` : null,
            date: new Date().toISOString(),
            source_link: row.source_link || null,
        };
        records.push(shoeInput);
    }
    console.log(`Parsed ${records.length} records from CSV`);
    // Process records one by one to handle duplicates
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    for (const record of records) {
        try {
            // Check if already exists
            const { data: existing } = await supabase_1.supabaseAdmin
                .from('shoe_results')
                .select('id, article_id')
                .eq('article_id', record.article_id)
                .maybeSingle();
            if (existing) {
                console.log(`Skipping existing: ${record.brand_name} ${record.model}`);
                skipped++;
                continue;
            }
            // Insert new record
            const { error } = await supabase_1.supabaseAdmin
                .from('shoe_results')
                .insert([record]);
            if (error) {
                console.error(`Error inserting ${record.brand_name} ${record.model}:`, error.message);
                errors++;
            }
            else {
                console.log(`✓ Inserted: ${record.brand_name} ${record.model}`);
                inserted++;
            }
        }
        catch (err) {
            console.error(`Exception for ${record.brand_name} ${record.model}:`, err);
            errors++;
        }
    }
    console.log('\n=== Import Summary ===');
    console.log(`Total records: ${records.length}`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped (already exists): ${skipped}`);
    console.log(`Errors: ${errors}`);
}
importData().catch(console.error);
//# sourceMappingURL=import_runrepeat.js.map