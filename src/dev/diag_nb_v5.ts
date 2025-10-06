import 'dotenv/config';
import Airtable from 'airtable';
import { brandModelFromTitle } from '../transform/brandModelFromTitle';
import { fromAirtableToShoeInputs } from '../pipeline/fromAirtableToShoeInputs';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! })
  .base(process.env.AIRTABLE_BASE_ID!);
const tableName = process.env.AIRTABLE_TABLE_NAME!;

async function run() {
  const recId = 'recv3AzbI18TYRfFi'; // из твоей строки CSV
  const r = await base(tableName).find(recId);
  const title = String(r.fields?.Title ?? '');
  const bm = brandModelFromTitle(title);
  console.log({ title, title_brand: bm.brand, title_model: bm.model });

  const inputs = await fromAirtableToShoeInputs([r]);
  console.log('models:', inputs.map(x => ({ brand: x.brand_name, model: x.model, model_key: (x as any).model_key })));
}

run().catch(e => { console.error(e); process.exit(1); });
