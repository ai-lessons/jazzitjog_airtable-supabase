// Run SQL migration file
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration(filename: string) {
  const migrationPath = join(process.cwd(), 'migrations', filename);

  console.log(`📄 Reading migration: ${filename}\n`);

  const sql = readFileSync(migrationPath, 'utf-8');

  // Split by semicolon but keep statements that are inside DO blocks
  const statements = sql
    .split(/;(?![^$]*\$\$)/) // Split by ; but not inside $$ blocks
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s !== '');

  console.log(`Found ${statements.length} SQL statements\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];

    // Skip comments
    if (stmt.startsWith('--') || stmt.length < 5) {
      continue;
    }

    console.log(`[${i + 1}/${statements.length}] Executing...`);
    console.log(stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''));

    try {
      // Use rpc to execute raw SQL
      const { data, error } = await client.rpc('exec_sql', {
        sql: stmt + ';'
      });

      if (error) {
        // Check if it's a benign error (e.g., "already exists")
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('IF NOT EXISTS')
        ) {
          console.log('  ⚠️  Skipped (already exists)');
        } else {
          console.error('  ❌ Error:', error.message);
          errorCount++;
        }
      } else {
        console.log('  ✅ Success');
        successCount++;
      }
    } catch (err) {
      console.error('  ❌ Exception:', err);
      errorCount++;
    }

    console.log('');
  }

  console.log(`\n📊 Migration complete:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors:  ${errorCount}`);
}

const migrationFile = process.argv[2] || '001_add_indexes_to_shoe_results.sql';

runMigration(migrationFile).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
