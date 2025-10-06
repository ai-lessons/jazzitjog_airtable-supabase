// Run migration 002 - Remove CHECK constraint
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration() {
  console.log('🚀 Running Migration 002: Remove CHECK constraint\n');

  // Read migration file
  const migrationPath = join(process.cwd(), 'migrations', '002_remove_check_constraint.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  console.log('📄 Migration SQL:');
  console.log('━'.repeat(80));
  console.log(sql);
  console.log('━'.repeat(80));
  console.log('\n');

  // Split SQL into statements (excluding comments and empty lines)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.length > 10);

  console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    const preview = stmt.substring(0, 100).replace(/\n/g, ' ');

    console.log(`[${i + 1}/${statements.length}] Executing:`);
    console.log(`   ${preview}${stmt.length > 100 ? '...' : ''}`);

    try {
      // Execute via direct query
      const { data, error } = await client.rpc('query', { query_text: stmt });

      if (error) {
        // Try alternative method - direct from() query won't work for DDL
        console.log('   ⚠️  RPC method failed, trying raw SQL...');

        // For DDL statements, we need to use Supabase's REST API differently
        // Let's try using the postgrest endpoint directly
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          },
          body: JSON.stringify({ sql: stmt })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('   ❌ Error:', errorText);
          errorCount++;
        } else {
          const result = await response.json();
          console.log('   ✅ Success:', result);
          successCount++;
        }
      } else {
        console.log('   ✅ Success');
        if (data) {
          console.log('   Result:', JSON.stringify(data, null, 2));
        }
        successCount++;
      }
    } catch (err) {
      console.error('   ❌ Exception:', err);
      errorCount++;
    }

    console.log('');
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors:  ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with errors. Please check manually.');
  }
}

runMigration().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
