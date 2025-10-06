// src/dev/upsert_batch_test.ts
import { upsertResultsBatch, ShoeResult } from '../db/upsertResults';

const rows: ShoeResult[] = [
  {
    brand_name: 'Nike',
    model: 'ZoomX Vaporfly 3',
    primary_use: 'racing',
    source_link: 'https://example.com/a',
    article_id: 'A1',
    price: 249.99,
    date: '2025-01-15',
  },
  {
    brand_name: 'Asics',
    model: 'Metaspeed Sky+',
    source_link: 'https://example.com/b',
    article_id: 'B1',
    carbon_plate: true,
  },
];

(async () => {
  await upsertResultsBatch(rows, 500);
  console.log('Batch upsert OK:', rows.length);
})();
