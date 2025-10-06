// src/dev/upsert_batch_test.ts
import 'dotenv/config';
import saveToSupabase from "../pipeline/saveToSupabase";
import { tightenInput, type ShoeInputLoose } from "../transform/fields";

async function main() {
  // пример тестовых данных (loose)
  const sample: ShoeInputLoose[] = [
    {
      article_id: 999,
      record_id: 'rec_test_1',
      brand_name: 'TestBrand',
      model: 'Model X',
      price: 199,
      weight: 250,
      primary_use: 'road',
      surface_type: 'road',
      date: new Date().toISOString(),
      source_link: 'https://example.com'
    }
  ];

  // приведём к строгому виду
  const strict = sample.map(s => tightenInput(s)).filter(Boolean) as any[];

  const res = await saveToSupabase(strict);
  console.log('upsert_batch_test result:', res);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
