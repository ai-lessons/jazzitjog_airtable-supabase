import 'dotenv/config';

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const cfg = {
  // Supabase
  supabaseUrl: need('SUPABASE_URL'),
  supabaseServiceRoleKey: need('SUPABASE_SERVICE_ROLE_KEY'),
  // Airtable
  airtableApiKey: need('AIRTABLE_API_KEY'),
  airtableBaseId: need('AIRTABLE_BASE_ID'),
  airtableTable: process.env.AIRTABLE_TABLE_NAME || 'Table 1',
};
