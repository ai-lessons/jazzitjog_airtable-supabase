// src/db/upsertResults.ts (aligned with airtable_id)
import { createClient } from '@supabase/supabase-js';
type UpsertRow = {
  model_key: string;
  airtable_id: string | null;
  brand_name: string;
  model: string;
  [key: string]: any;
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function upsertResults(rows: UpsertRow[], opts?: { dryRun?: boolean }) {
  if (!Array.isArray(rows) || rows.length === 0) return { written: 0 };
  for (const r of rows) {
    if (!r.model_key) throw new Error(`upsertResults: model_key is required`);
    if (!r.airtable_id) throw new Error(`upsertResults: airtable_id is required`);
  }
  if (opts?.dryRun) return { written: rows.length };

  // Upsert into shoe_results using (airtable_id,brand_name,model)
  const { data, error } = await supabase
    .from('shoe_results')
    .upsert(rows, {
      onConflict: 'airtable_id,brand_name,model',
      ignoreDuplicates: false,
      defaultToNull: true,
    })
    .select('id');

  if (error) throw error;
  return { written: data?.length ?? rows.length };
}

/** Batch upsert with chunking */
export async function upsertResultsInBatches(rows: UpsertRow[], chunkSize = 500, opts?: { dryRun?: boolean }) {
  if (!Array.isArray(rows) || rows.length === 0) return { written: 0 };
  for (const r of rows) {
    if (!r.model_key) throw new Error(`upsertResultsInBatches: model_key is required`);
    if (!r.airtable_id) throw new Error(`upsertResultsInBatches: airtable_id is required`);
  }
  if (opts?.dryRun) return { written: rows.length };

  let written = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('shoe_results')
      .upsert(chunk, {
        onConflict: 'airtable_id,brand_name,model',
        ignoreDuplicates: false,
        defaultToNull: true,
      })
      .select('id');
    if (error) throw error;
    written += (data?.length ?? chunk.length);
  }
  return { written };
}
