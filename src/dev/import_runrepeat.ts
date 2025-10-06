import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { supabaseAdmin } from '../db/supabase';
import type { ShoeInput } from '../core/types';

type CSVRow = {
  brand: string;
  model: string;
  use: string;
  surface: string;
  heel: string;
  forefoot: string;
  drop: string;
  weight: string;
  price: string;
  plate: string;
  waterproof: string;
  cushioning: string;
  width: string;
  breathability: string;
  source_link: string;
};

function parseNumber(value: string): number | null {
  if (!value || value === 'N/A') return null;

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

function parseBoolean(value: string): boolean | null {
  if (!value || value === 'N/A') return null;
  return value.toLowerCase() === 'yes';
}

function parsePlate(value: string): boolean | null {
  if (!value || value === 'N/A' || value === 'no') return null;
  return value.toLowerCase() !== 'no';
}

function parseBreathability(value: string): "low" | "medium" | "high" | null {
  if (!value || value === 'N/A') return null;
  const lower = value.toLowerCase();
  if (lower === 'low') return 'low';
  if (lower === 'medium') return 'medium';
  if (lower === 'high') return 'high';
  return null;
}

function parseCushioning(value: string): "firm" | "balanced" | "max" | null {
  if (!value || value === 'N/A') return null;
  const lower = value.toLowerCase();

  // Map various cushioning types to our categories
  if (lower.includes('firm') || lower.includes('minimal')) return 'firm';
  if (lower.includes('balanced') || lower.includes('moderate') || lower.includes('average') || lower.includes('responsive')) return 'balanced';
  if (lower.includes('max') || lower.includes('plush') || lower.includes('soft') || lower.includes('cushioned')) return 'max';

  return null;
}

function parseWidth(value: string): "narrow" | "standard" | "wide" | null {
  if (!value || value === 'N/A') return null;
  const lower = value.toLowerCase();
  if (lower === 'narrow') return 'narrow';
  if (lower === 'normal') return 'standard';
  if (lower === 'wide') return 'wide';
  return null;
}

function parseSurface(value: string): "road" | "trail" | null {
  if (!value || value === 'N/A') return null;
  const lower = value.toLowerCase();
  if (lower === 'road') return 'road';
  if (lower === 'trail') return 'trail';
  return null;
}

function createArticleId(brand: string, model: string): string {
  if (!brand || !model) return '';
  return `${brand.toLowerCase().replace(/\s+/g, '-')}_${model.toLowerCase().replace(/\s+/g, '-')}`;
}

function createModelKey(brand: string, model: string): string {
  if (!brand || !model) return '';
  return `${brand.toLowerCase()}::${model.toLowerCase()}`;
}

async function importData() {
  const records: ShoeInput[] = [];
  const csvPath = 'H:\\sneaker-pipeline\\docs\\runrepeat_data.csv';

  const parser = createReadStream(csvPath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Handle UTF-8 BOM
    })
  );

  for await (const row of parser as AsyncIterable<CSVRow>) {
    // Skip rows with missing brand or model
    if (!row.brand || !row.model) {
      console.log('Skipping row with missing brand/model:', row);
      continue;
    }

    const shoeInput: ShoeInput = {
      article_id: createArticleId(row.brand, row.model),
      record_id: null,
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
      const { data: existing } = await supabaseAdmin
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
      const { error } = await supabaseAdmin
        .from('shoe_results')
        .insert([record]);

      if (error) {
        console.error(`Error inserting ${record.brand_name} ${record.model}:`, error.message);
        errors++;
      } else {
        console.log(`✓ Inserted: ${record.brand_name} ${record.model}`);
        inserted++;
      }
    } catch (err) {
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
