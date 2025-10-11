// src/db/rejected.ts
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function logRejected(r: {
  airtable_id?: string | null;
  record_id?: string | null; // legacy
  model_key?: string | null;
  brand_name?: string | null;
  model?: string | null;
  reason: string;
  source_link?: string | null;
  title?: string | null;
}) {
  try {
    await supabase.from('shoe_results_rejected').insert([{
      // Keep legacy column for compatibility; prefer airtable_id value
      record_id: (r.airtable_id ?? r.record_id) ?? null,
      airtable_id: r.airtable_id ?? r.record_id ?? null,
      model_key: r.model_key ?? null,
      brand_name: r.brand_name ?? null,
      model: r.model ?? null,
      reason: r.reason,
      source_link: r.source_link ?? null,
      title: r.title ?? null,
    }]).select('id');
  } catch (e) {
    // не роняем ETL из-за логгера
    console.warn('logRejected failed:', (e as any)?.message || e);
  }
}
