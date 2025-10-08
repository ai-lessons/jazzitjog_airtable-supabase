import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fqcwpcyxofowscluryej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxY3dwY3l4b2Zvd3NjbHVyeWVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgyNjM5MywiZXhwIjoyMDczNDAyMzkzfQ.QosWygGvcAcHKXVq8RBXXGCJ_DY5YIvOuPM2kl92zFM'
);

console.log('Testing database access...\n');

// Check shoe_results table
console.log('1. Checking shoe_results table:');
const { data: shoeData, error: shoeError } = await supabase
  .from('shoe_results')
  .select('*', { count: 'exact', head: true });

if (shoeError) {
  console.log('   ❌ Error:', shoeError.message);
} else {
  console.log('   ✅ Table exists');
}

// Check shoes_search table (used in Search component)
console.log('\n2. Checking shoes_search table:');
const { data: searchData, error: searchError } = await supabase
  .from('shoes_search')
  .select('*', { count: 'exact', head: true });

if (searchError) {
  console.log('   ❌ Error:', searchError.message);
} else {
  console.log('   ✅ Table exists');
}

// List all accessible tables
console.log('\n3. Checking schema info:');
const { data: tables, error: tablesError } = await supabase
  .from('information_schema.tables')
  .select('table_name')
  .eq('table_schema', 'public');

if (tablesError) {
  console.log('   ❌ Error:', tablesError.message);
} else {
  console.log('   Available tables:', tables?.map(t => t.table_name).join(', '));
}
