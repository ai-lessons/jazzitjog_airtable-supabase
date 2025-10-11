import 'dotenv/config';
import Airtable from 'airtable';
import { fromAirtableToShoeInputs } from '../pipeline/fromAirtableToShoeInputs';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! })
  .base(process.env.AIRTABLE_BASE_ID!);
const tableName = process.env.AIRTABLE_TABLE_NAME!;

async function run() {
  // точечно читаем запись по airtable_id (Airtable record id)
  const recId = 'recR9MMIHkbs1LkYm';
  const record = await base(tableName).find(recId);

  const inputs = await fromAirtableToShoeInputs([record]);

  if (!inputs.length) {
    console.log('❌ Конвертер вернул 0 моделей для этой записи');
    return;
  }

  // печатаем то, что полетит в upsert (ShoeInput)
  for (const x of inputs) {
    console.log('—'.repeat(80));
    console.log({
      article_id: x.article_id,
      airtable_id: x.airtable_id || x.record_id,
      brand_name: x.brand_name,
      model: x.model,
      price: x.price,
      heel_height: x.heel_height,
      forefoot_height: x.forefoot_height,
      drop: x.drop,
      weight: x.weight,
      primary_use: x.primary_use,
      surface_type: x.surface_type,
      cushioning_type: x.cushioning_type,
      foot_width: x.foot_width,
      carbon_plate: x.carbon_plate,
      waterproof: x.waterproof,
      upper_breathability: x.upper_breathability,
      additional_features: x.additional_features,
      date: x.date,
      source_link: x.source_link,
    });
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
