// src/dev/trace_pipeline.ts
import 'dotenv/config';
import Airtable from 'airtable';
import { fromAirtableToShoeInputs } from '../pipeline/fromAirtableToShoeInputs';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! })
  .base(process.env.AIRTABLE_BASE_ID!);
const tableName = process.env.AIRTABLE_TABLE_NAME!;

// водяной знак: берём всё (можно сузить при необходимости)
const SINCE_ISO = '1970-01-01T00:00:00.000Z';

type Reason =
  | 'OK'
  | 'NO_ARTICLE_ID'
  | 'NO_CONTENT'
  | 'CONVERTER_EMPTY'
  | 'CORE_EMPTY';

const counters: Record<Reason, number> = {
  OK: 0, NO_ARTICLE_ID: 0, NO_CONTENT: 0, CONVERTER_EMPTY: 0, CORE_EMPTY: 0
};

function hasCore(x: any) {
  return x.primary_use != null
      || x.surface_type != null
      || x.heel_height != null
      || x.weight != null;
}

function logRow(tag: string, obj: any) {
  console.log('—'.repeat(100));
  console.log(`[${tag}]`, obj);
}

async function run() {
  const formula = `IS_AFTER(CREATED_TIME(), DATETIME_PARSE('${SINCE_ISO}', 'YYYY-MM-DDTHH:mm:ss.SSSZ'))`;
  let rows = 0;

  await base(tableName)
    .select({ filterByFormula: formula, pageSize: 100 })
    .eachPage(async (records, next) => {
      for (const r of records) {
        rows++;
        // @ts-ignore
        const createdTime: string = r._rawJson?.createdTime ?? '';
        const f: any = r.fields ?? {};
        const title = String(f?.Title ?? '');
        const content = String(f?.Content ?? '');

        // 1) обобщённая трассировка Kailas и похожих кейсов
        const isKailas = /kailas/i.test(title) || /kailas/i.test(content);

        // 2) базовые проверки
        const rawId = f?.ID ?? f?.Id ?? f?.id ?? f?.article_id ?? null;
        const article_id = Number(String(rawId ?? '').replace(/[^\d]/g, ''));
        if (!article_id) {
          counters.NO_ARTICLE_ID++;
          if (isKailas) logRow('NO_ARTICLE_ID', { airtable_record_id: r.id, title, createdTime });
          continue;
        }

        if (!content.trim()) {
          counters.NO_CONTENT++;
          if (isKailas) logRow('NO_CONTENT', { airtable_record_id: r.id, title, createdTime });
          continue;
        }

        // 3) прогон конвертера (без апсерта)
        let inputs: any[] = [];
        try {
          inputs = await fromAirtableToShoeInputs([r]);
        } catch (e) {
          // если конвертер упал, считаем как пустой результат
          inputs = [];
        }

        if (!inputs.length) {
          counters.CONVERTER_EMPTY++;
          if (isKailas) logRow('CONVERTER_EMPTY', { airtable_record_id: r.id, title, createdTime });
          continue;
        }

        // 4) проверка core-полей (именно этот порог мы enforce'им в БД)
        const good = inputs.filter(hasCore);
        if (!good.length) {
          counters.CORE_EMPTY++;
          if (isKailas) logRow('CORE_EMPTY', {
            airtable_record_id: r.id, title, createdTime, sample: inputs[0]
          });
          continue;
        }

        counters.OK++;
        if (isKailas) {
          // печатаем финальный объект, который бы пошёл в upsert
          logRow('OK-KAILAS', { airtable_record_id: r.id, createdTime, sample: good[0] });
        }
      }
      next();
    });

  console.log('\n===== SUMMARY =====');
  console.log({ rows_scanned: rows, ...counters });
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
