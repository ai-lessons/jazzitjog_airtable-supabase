// src/pipeline/saveToSupabase.ts
import { upsertResultsInBatches } from "../db/upsertResults";
import { normalizeAll, type ShoeInput, type ShoeRow } from "../transform/fields";

export default async function saveToSupabase(rows: ShoeInput[] | ShoeRow[] | any[]) {
  // если прилетели «loose»-объекты — приведём
  const strictRows: ShoeInput[] = normalizeAll(rows as any);
  if (!strictRows.length) return { written: 0 };

  const dryRun = process.env.DRY_RUN === '1';
  const res = await upsertResultsInBatches(strictRows, 500, { dryRun });
  return res;
}
