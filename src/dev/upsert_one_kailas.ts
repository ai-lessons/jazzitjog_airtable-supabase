// src/dev/upsert_one_kailas.ts
import 'dotenv/config';
import Airtable from 'airtable';
import { fromAirtableToShoeInputs } from '../pipeline/fromAirtableToShoeInputs';
import { upsertResults } from '../db/upsertResults';

async function main() {
  const recId = 'recR9MMIHkbs1LkYm'; // Kailas FUGA EX 330
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! })
    .base(process.env.AIRTABLE_BASE_ID!);
  const tableName = process.env.AIRTABLE_TABLE_NAME!;

  const record = await base(tableName).find(recId);
  const inputs = await fromAirtableToShoeInputs([record]);

  if (!inputs.length) {
    console.error('❌ Нет валидных моделей из fromAirtableToShoeInputs для', recId);
    process.exit(1);
  }

  console.log('📦 Готовим UPSERT:', inputs);
  const res = await upsertResults(inputs);
  console.log('✅ upsertResults завершён:', res ?? 'ok');
}

main().catch(err => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});
