// src/db/upsertResults.ts
import { createClient } from '@supabase/supabase-js';
import type { ShoeInput } from '../transform/fields';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function upsertResults(rows: ShoeInput[], opts?: { dryRun?: boolean }) {
  if (!Array.isArray(rows) || rows.length === 0) return { written: 0 };
  for (const r of rows) {
    if (!r.model_key) throw new Error(`upsertResults: model_key is required`);
    if (!r.record_id) throw new Error(`upsertResults: record_id is required`);
  }
  if (opts?.dryRun) return { written: rows.length };

  // по умолчанию пишем целиком (но saveToSupabase использует батчи)
  const { data, error } = await supabase
    .from('shoe_results')
    .upsert(rows, {
      onConflict: 'record_id,model_key',
      ignoreDuplicates: false,
      defaultToNull: true,
    })
    .select('id');

  if (error) throw error;
  return { written: data?.length ?? rows.length };
}

/** Совместимый батчевый апсерт (для старого кода) */
export async function upsertResultsInBatches(rows: ShoeInput[], chunkSize = 500, opts?: { dryRun?: boolean }) {
  if (!Array.isArray(rows) || rows.length === 0) return { written: 0 };
  for (const r of rows) {
    if (!r.model_key) throw new Error(`upsertResultsInBatches: model_key is required`);
    if (!r.record_id) throw new Error(`upsertResultsInBatches: record_id is required`);
  }
  if (opts?.dryRun) return { written: rows.length };

  let written = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('shoe_results')
      .upsert(chunk, {
        onConflict: 'record_id,model_key',
        ignoreDuplicates: false,
        defaultToNull: true,
      })
      .select('id');
    if (error) throw error;
    written += (data?.length ?? chunk.length);
  }
  return { written };
}
