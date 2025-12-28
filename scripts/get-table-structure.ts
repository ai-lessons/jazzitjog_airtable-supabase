import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function getTableStructure() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_KEY!;
  const client = createClient(supabaseUrl, supabaseKey);

  // Predefined list of tables to check
  const tablesToCheck = ['JazzItJog_db', 'staging_table', 'etl_state', 'shoe_results'];

  console.log('🔍 Checking Database Schema:\n');

  for (const tableName of tablesToCheck) {
    console.log(`📋 Analyzing ${tableName} table structure:\n`);
    
    try {
      // First, check if the table exists by trying to select from it
      const { data: tableExists, error: existsError } = await client
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (existsError) {
        console.log(`⚠️ Table ${tableName} does not exist or is not accessible.`);
        console.error('Error details:', existsError);
        continue;
      }

      // If table exists, try to get a sample row to understand its structure
      const { data: sampleData, error: sampleError } = await client
        .from(tableName)
        .select('*')
        .limit(1);

      if (sampleError) {
        console.log(`⚠️ Could not retrieve sample data for ${tableName}`);
        console.error('Error details:', sampleError);
        continue;
      }

      if (!sampleData || sampleData.length === 0) {
        console.log(`⚠️ Table ${tableName} is empty.`);
        continue;
      }

      // Display column names and their types
      const sampleRow = sampleData[0];
      const columnInfo = Object.entries(sampleRow).map(([column_name, value]) => ({
        column_name,
        data_type: typeof value,
        is_nullable: value === null ? 'YES' : 'NO'
      }));

      console.log('Columns:');
      console.table(columnInfo);

      // Attempt to find primary key (this might require a custom approach)
      console.log('\nPrimary Key Detection:');
      const primaryKeyColumn = columnInfo.find(col => 
        col.column_name.toLowerCase().includes('id') || 
        col.column_name.toLowerCase() === 'primary_key'
      );

      if (primaryKeyColumn) {
        console.log(`Potential Primary Key: ${primaryKeyColumn.column_name}`);
      } else {
        console.log('No obvious primary key column found.');
      }

      console.log('\n' + '-'.repeat(50) + '\n');

    } catch (error) {
      console.error(`Unexpected error analyzing ${tableName}:`, error);
    }
  }
}

getTableStructure().catch(console.error);
