// src/dev/upsert_by_record_ids.ts
import 'dotenv/config';
import Airtable from 'airtable';
import { fromAirtableToShoeInputs } from '../pipeline/fromAirtableToShoeInputs';
import { upsertResults } from '../db/upsertResults';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! })
  .base(process.env.AIRTABLE_BASE_ID!);
const tableName = process.env.AIRTABLE_TABLE_NAME!;

function uniqBy<T>(arr: T[], key: (x: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k = key(x);
    if (!seen.has(k)) { seen.add(k); out.push(x); }
  }
  return out;
}

async function run(ids: string[]) {
  if (!ids.length) {
    console.error('Usage: npx tsx src/dev/upsert_by_record_ids.ts <airtable_rec_id> [...]');
    process.exit(1);
  }

  // тянем записи из Airtable по их record_id
  const recs = await Promise.all(ids.map(async (id) => {
    try { return await base(tableName).find(id); }
    catch (e: any) {
      console.error(`⚠️  Не найдено в Airtable: ${id} (${e?.message || e})`);
      return null as any;
    }
  }));
  const found = recs.filter(Boolean);
  if (found.length === 0) {
    console.error('❌ Нет валидных записей для апсерта.');
    process.exit(1);
  }

  // конвертируем в ShoeInput
  const inputs = await fromAirtableToShoeInputs(found);

  if (!inputs.length) {
    console.error('❌ Конвертер вернул 0 моделей.');
    process.exit(1);
  }

  // на всякий случай — уникализируем по (record_id, model_key)
  const dedup = uniqBy(inputs, (x: any) => `${x.record_id}::${x.model_key}`);

  // валидация обязательных полей
  for (const r of dedup as any[]) {
    if (!r.record_id) throw new Error('record_id is required');
    if (!r.model_key) throw new Error('model_key is required');
  }

  console.log('📦 Готовим UPSERT:', dedup.map((r: any) => ({
    record_id: r.record_id, brand: r.brand_name, model: r.model, model_key: r.model_key, price: r.price
  })));

  const res = await upsertResults(dedup as any[]);
  console.log('✅ upserted:', res);
}

// CLI: ids из аргументов
const ids = process.argv.slice(2).map(s => s.trim()).filter(Boolean);
run(ids).catch(e => { console.error('❌ Ошибка:', e); process.exit(1); });
