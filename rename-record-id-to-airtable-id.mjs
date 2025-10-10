// Script to rename record_id to airtable_id in source files
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const filesToUpdate = [
  'src/etl/ingest/types.ts',
  'src/etl/ingest/from_airtable.ts',
  'src/etl/extract/types.ts',
  'src/etl/build/types.ts',
  'src/etl/build/shoe_input.ts',
  'src/etl/run.ts',
  'src/etl/run-staging.ts',
  'src/etl/upsert/to_supabase.ts',
  'src/etl/upsert/to_staging.ts',
];

console.log('🔄 Renaming record_id to airtable_id in source files...\n');

filesToUpdate.forEach(file => {
  try {
    console.log(`Processing: ${file}`);

    let content = readFileSync(file, 'utf8');
    let changeCount = 0;

    // Replace record_id with airtable_id (but not in comments about shoe_results table)
    const replacements = [
      // Type definitions
      { from: /record_id: string/g, to: 'airtable_id: string', desc: 'type definition' },
      { from: /record_id\?: string/g, to: 'airtable_id?: string', desc: 'optional type' },
      { from: /record_id\?: string \| null/g, to: 'airtable_id?: string | null', desc: 'nullable type' },
      { from: /record_id \| null/g, to: 'airtable_id | null', desc: 'nullable union' },

      // Property access
      { from: /article\.record_id/g, to: 'article.airtable_id', desc: 'article property' },
      { from: /context\.record_id/g, to: 'context.airtable_id', desc: 'context property' },
      { from: /record\.id/g, to: 'record.id', desc: 'Airtable record.id (keep)' },

      // Object properties
      { from: /record_id:/g, to: 'airtable_id:', desc: 'object property' },
      { from: /'record_id'/g, to: "'airtable_id'", desc: 'string literal' },
      { from: /"record_id"/g, to: '"airtable_id"', desc: 'double quote literal' },

      // Variable names
      { from: /const record_id =/g, to: 'const airtable_id =', desc: 'const declaration' },
      { from: /let record_id =/g, to: 'let airtable_id =', desc: 'let declaration' },
    ];

    replacements.forEach(({ from, to, desc }) => {
      const matches = content.match(from);
      if (matches) {
        content = content.replace(from, to);
        changeCount += matches.length;
        console.log(`  ✓ Replaced ${matches.length}x: ${desc}`);
      }
    });

    if (changeCount > 0) {
      writeFileSync(file, content, 'utf8');
      console.log(`  ✅ Saved with ${changeCount} changes\n`);
    } else {
      console.log(`  ⏭️  No changes needed\n`);
    }

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}\n`);
  }
});

console.log('✅ Renaming complete!');
console.log('\n⚠️  Note: You may need to manually review:');
console.log('  - Comments mentioning record_id');
console.log('  - SQL queries or database schemas');
console.log('  - Test files');
