// Show migration SQL for easy copy-paste
import { readFileSync } from 'fs';
import { join } from 'path';

const migrationFile = process.argv[2] || '002_remove_check_constraint.sql';
const migrationPath = join(process.cwd(), 'migrations', migrationFile);

console.log('📄 Migration:', migrationFile);
console.log('━'.repeat(80));
console.log('\n');

try {
  const sql = readFileSync(migrationPath, 'utf-8');
  console.log(sql);
  console.log('\n');
  console.log('━'.repeat(80));
  console.log('📋 Copy the SQL above and paste into Supabase SQL Editor');
  console.log('🔗 https://supabase.com/dashboard/project/fqcwpcyxofowscluryej/sql');
} catch (error) {
  console.error('❌ Error reading migration file:', error);
  console.log('\nAvailable migrations:');
  console.log('  - 001_add_indexes_to_shoe_results.sql');
  console.log('  - 002_remove_check_constraint.sql');
}
