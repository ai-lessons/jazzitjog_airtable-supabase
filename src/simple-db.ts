import { createClient } from '@supabase/supabase-js';
import type { SneakerData } from './simple-parser';

export interface DatabaseRecord {
  id?: number;
  article_id: number;
  record_id: string;
  brand_name: string;
  model: string;
  model_key: string;
  primary_use?: string;
  surface_type?: string;
  heel_height?: number;
  forefoot_height?: number;
  drop?: number;
  weight?: number;
  price?: number;
  carbon_plate?: boolean;
  waterproof?: boolean;
  cushioning_type?: string;
  foot_width?: string;
  upper_breathability?: string;
  date?: string;
  source_link?: string;
  created_at?: string;
  updated_at?: string;
}

export class SimpleDatabase {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async saveSneakers(
    article_id: number,
    record_id: string,
    sneakers: SneakerData[]
  ): Promise<{ success: number; errors: string[] }> {
    const results = { success: 0, errors: [] as string[] };

    for (const sneaker of sneakers) {
      try {
        const record = this.sneakerToRecord(article_id, record_id, sneaker);
        await this.upsertRecord(record);
        results.success++;
      } catch (error) {
        results.errors.push(`${sneaker.brand} ${sneaker.model}: ${error}`);
      }
    }

    return results;
  }

  private sneakerToRecord(
    article_id: number,
    record_id: string,
    sneaker: SneakerData
  ): DatabaseRecord {
    const model_key = this.makeModelKey(sneaker.brand, sneaker.model);

    return {
      article_id,
      record_id,
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

  private makeModelKey(brand: string, model: string): string {
    const normalize = (s: string) =>
      s.toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');

    const b = normalize(brand);
    const m = normalize(model);

    return `${b}::${m}`;
  }

  private async upsertRecord(record: DatabaseRecord): Promise<void> {
    // Check if record exists
    const existing = await this.findExisting(record.record_id, record.model_key);

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
    } else {
      // Insert new record
      const { error } = await this.supabase
        .from('shoe_results')
        .insert([record]);

      if (error) {
        throw new Error(`Insert failed: ${error.message}`);
      }
    }
  }

  private async findExisting(record_id: string, model_key: string): Promise<DatabaseRecord | null> {
    const { data, error } = await this.supabase
      .from('shoe_results')
      .select('*')
      .eq('record_id', record_id)
      .eq('model_key', model_key)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Query failed: ${error.message}`);
    }

    return data || null;
  }

  private mergeRecords(existing: DatabaseRecord, newRecord: DatabaseRecord): DatabaseRecord {
    const merged = { ...existing };

    // Update with non-null values from new record
    Object.keys(newRecord).forEach(key => {
      const newValue = (newRecord as any)[key];
      const existingValue = (existing as any)[key];

      // Update if new value is not null/undefined and existing is null/undefined
      if (newValue !== null && newValue !== undefined) {
        if (existingValue === null || existingValue === undefined) {
          (merged as any)[key] = newValue;
        }
      }
    });

    merged.updated_at = new Date().toISOString();

    return merged;
  }

  async getStats(): Promise<{
    total_records: number;
    unique_models: number;
    brands: string[];
  }> {
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

  async clearAll(): Promise<{
    success: boolean;
    deleted_count: number;
    error?: string;
  }> {
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
    } catch (error) {
      return {
        success: false,
        deleted_count: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}