import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string;
}

interface TableSample {
  [key: string]: any;
}

async function getDetailedSchema() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_KEY!;
  const client = createClient(supabaseUrl, supabaseKey);

  const tables = ['JazzItJog_db', 'staging_table', 'shoe_results'];

  for (const tableName of tables) {
    console.log(`\n## Table: ${tableName}`);

    // Retrieve a sample row to get column information
    const { data: sampleData, error: sampleError } = await client
      .from(tableName)
      .select('*')
      .limit(1);

    if (sampleError || !sampleData || sampleData.length === 0) {
      console.log(`Unable to retrieve columns for ${tableName}`);
      console.error(sampleError);
      continue;
    }

    // Extract column information from the sample row
    const columns: ColumnInfo[] = Object.entries(sampleData[0] as TableSample).map(([column_name, value]) => ({
      column_name,
      data_type: typeof value,
      is_nullable: value === null ? 'YES' : 'NO',
      column_default: 'None'
    }));

    console.log('Columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} | ${col.data_type} | nullable=${col.is_nullable} | default=${col.column_default}`);
    });

    // Attempt to find primary key
    console.log('\nPrimary Key Detection:');
    const primaryKeyColumn = columns.find(col => 
      col.column_name.toLowerCase().includes('id') || 
      col.column_name.toLowerCase() === 'primary_key'
    );

    if (primaryKeyColumn) {
      console.log(`  Potential Primary Key: ${primaryKeyColumn.column_name}`);
    } else {
      console.log('  No obvious primary key found');
    }

    console.log('\n' + '-'.repeat(50));
  }

  // Additional specific column checks
  console.log('\n## Additional Checks');
  const specificColumnChecks = [
    { table: 'JazzItJog_db', column: 'ID' },
    { table: 'staging_table', column: 'airtable_id' },
    { table: 'shoe_results', column: 'airtable_id' },
    { table: 'staging_table', column: 'article_id' },
    { table: 'shoe_results', column: 'article_id' }
  ];

  for (const check of specificColumnChecks) {
    const { data: sampleData, error } = await client
      .from(check.table)
      .select(check.column)
      .limit(1);

    if (error || !sampleData || sampleData.length === 0) {
      console.log(`${check.table}.${check.column}: Not found`);
    } else {
      const sampleRow = sampleData[0] as TableSample;
      const columnType = typeof sampleRow[check.column];
      console.log(`${check.table}.${check.column}: Found (type: ${columnType})`);
    }
  }
}

getDetailedSchema().catch(console.error);
