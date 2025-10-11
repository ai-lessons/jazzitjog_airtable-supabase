// src/dev/upsert_from_airtable.ts
import 'dotenv/config';
import Airtable from 'airtable';
import { fromAirtableToShoeInputs } from '../pipeline/fromAirtableToShoeInputs';
import { upsertResults } from '../db/upsertResults';
import { getWatermark, setWatermark } from '../db/watermark';
import { logRejected } from '../db/rejected';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! })
  .base(process.env.AIRTABLE_BASE_ID!);
const tableName = process.env.AIRTABLE_TABLE_NAME!;

type Cnt = Record<string, number>;
const cnt: Cnt = { OK:0, NO_ID:0, NO_CONTENT:0, CONVERTER_EMPTY:0, CORE_EMPTY:0, IRRELEVANT:0, UPSERT_ERROR:0 };

function inc(k: keyof typeof cnt) { cnt[k] = (cnt[k] ?? 0) + 1; }

function getField(obj:any, keys:string[]) {
  const f = (obj?.fields ?? obj) as any;
  if (!f) return undefined;
  for (const k of Object.keys(f)) if (keys.map(x=>x.toLowerCase()).includes(k.toLowerCase())) return f[k];
  return undefined;
}

function toPositiveInt(x: any): number | null {
  const n = Number(String(x ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function run() {
  const dryRun = process.env.DRY_RUN === '1';
  const { last_airtable_created_at } = await getWatermark();
  const since = new Date(last_airtable_created_at);

  let processed = 0;
  let maxCreated = since.toISOString();

  const accepted: any[] = [];

  // Airtable paging
  await base(tableName).select({
    pageSize: 100,
    sort: [{ field: 'Created', direction: 'asc' }],
    // фильтры лучше делать в коде: старые бэзы могут не иметь поля Created в фильтре
  }).eachPage(async (records, next) => {
    for (const r of records) {
      const createdTime: string = (r as any)?._rawJson?.createdTime || r.get('Created') || r.get('Time created') || '';
      if (createdTime && createdTime <= last_airtable_created_at) {
        continue; // уже загружали
      }
      if (createdTime && createdTime > maxCreated) maxCreated = createdTime;

      const article_id = toPositiveInt(getField(r, ['ID','Id','id','article_id']));
      if (!article_id) { inc('NO_ID'); continue; }

      const content = String(getField(r, ['Content','Text','Article','content','text']) ?? '');
      if (!content.trim()) { inc('NO_CONTENT'); continue; }

      // конвертируем 1 запись → 0/1 моделей
      const inputs = await fromAirtableToShoeInputs([r]);

      if (!inputs.length) {
        inc('CONVERTER_EMPTY');
        // На soft-фильтре нерелевант не отбрасывается, поэтому это скорее всего пустой LLM+title
        continue;
      }

      for (const row of inputs) {
        // ядро: хотя бы одно поле
        const hasCore = row.primary_use != null || row.surface_type != null || row.heel_height != null || row.weight != null;
        if (!hasCore) {
          inc('CORE_EMPTY');
          await logRejected({ airtable_id: (row as any).airtable_id || (row as any).record_id, model_key: row.model_key, brand_name: row.brand_name, model: row.model, reason: 'core_empty', title: (r.get('Title') as any) || null, source_link: row.source_link });
          continue;
        }
        accepted.push(row);
        inc('OK');
      }

      processed++;
      if (processed % 100 === 0) {
        console.log(`[batch] processed=${processed}, accepted=${accepted.length}, maxCreated=${maxCreated}`);
      }
    }
    next();
  });

  // UPSERT принятого
  let written = 0;
  try {
    const res = await upsertResults(accepted, { dryRun });
    written = res.written;
  } catch (e:any) {
    console.error('❌ UPSERT_ERROR:', e?.message || e);
    inc('UPSERT_ERROR');
  }

  // Watermark
  if (accepted.length > 0) {
    await setWatermark({
      last_airtable_created_at: maxCreated,
      counters: cnt,
    });
  }

  console.log('==== SUMMARY ====', { counters: cnt, written, last_airtable_created_at, next_watermark: maxCreated, dryRun });
}

run().catch(e => { console.error(e); process.exit(1); });

