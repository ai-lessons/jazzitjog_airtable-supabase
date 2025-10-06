// src/dev/diag_kailas.ts
import 'dotenv/config';
import Airtable from 'airtable';
import { brandModelFromTitle } from '../transform/brandModelFromTitle';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! })
  .base(process.env.AIRTABLE_BASE_ID!);
const tableName = process.env.AIRTABLE_TABLE_NAME!;

async function run() {
  // Ищем статьи, где в Title или Content встречается Kailas (без учёта регистра)
  const formula = `OR(
    FIND("kailas", LOWER({Title})) > 0,
    FIND("kailas", LOWER({Content})) > 0
  )`;

  const rows: any[] = [];
  await base(tableName)
    .select({
      filterByFormula: formula,
      pageSize: 50,
    })
    .eachPage((records, next) => {
      for (const r of records) {
        // системное время создания
        // @ts-ignore
        const createdTime: string = r._rawJson?.createdTime ?? '';
        const fields = r.fields as any;

        const title = String(fields?.Title ?? '');
        const bm = brandModelFromTitle(title);

        rows.push({
          airtable_record_id: r.id,
          title,
          title_brand: bm.brand,
          title_model: bm.model,
          article_id_field: fields?.ID ?? fields?.Id ?? fields?.id ?? fields?.article_id ?? null,
          createdTime,
          has_content: typeof fields?.Content === 'string' && fields.Content.trim().length > 0,
          content_preview: (fields?.Content ?? '').slice(0, 140).replace(/\s+/g, ' '),
        });
      }
      next();
    });

  if (rows.length === 0) {
    console.log('❌ В Airtable не найдено статей с "Kailas" в Title/Content.');
  } else {
    console.log(`✅ Найдено записей: ${rows.length}`);
    for (const row of rows) {
      console.log('—'.repeat(80));
      console.log(row);
    }
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
