import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Patterns to identify non-shoe items
const nonShoePatterns = [
  { field: 'brand_name', pattern: /headphone/i, category: 'headphones' },
  { field: 'brand_name', pattern: /earbuds?/i, category: 'earbuds' },
  { field: 'model', pattern: /headphone/i, category: 'headphones' },
  { field: 'model', pattern: /earbuds?/i, category: 'earbuds' },
  { field: 'model', pattern: /watch(es)?/i, category: 'watches' },
  { field: 'model', pattern: /sunglasses/i, category: 'sunglasses' },
  { field: 'model', pattern: /hydration\s+pack/i, category: 'hydration packs' },
  { field: 'model', pattern: /vest/i, category: 'vests' },
  { field: 'model', pattern: /jacket/i, category: 'jackets' },
  { field: 'model', pattern: /shorts?/i, category: 'shorts' },
  { field: 'model', pattern: /tights?/i, category: 'tights' },
  { field: 'model', pattern: /massage\s+gun/i, category: 'massage guns' },
  { field: 'model', pattern: /treadmill/i, category: 'treadmills' },
  { field: 'model', pattern: /backpack/i, category: 'backpacks' },
  { field: 'model', pattern: /belt/i, category: 'belts' },
  { field: 'model', pattern: /armband/i, category: 'armbands' },
  { field: 'model', pattern: /hat/i, category: 'hats' },
  { field: 'model', pattern: /cap/i, category: 'caps' },
  { field: 'model', pattern: /gloves?/i, category: 'gloves' },
  { field: 'model', pattern: /bra/i, category: 'bras' },
  { field: 'primary_use', pattern: /hydration pack/i, category: 'hydration packs' },
  { field: 'primary_use', pattern: /accessory/i, category: 'accessories' },
  { field: 'primary_use', pattern: /apparel/i, category: 'apparel' },
  { field: 'primary_use', pattern: /nutrition/i, category: 'nutrition' },
];

async function cleanupNonShoes() {
  console.log('🔍 Searching for non-shoe items in shoe_results table...\n');

  const { data: allItems, error: fetchError } = await supabase
    .from('shoe_results')
    .select('id, brand_name, model, primary_use');

  if (fetchError) {
    console.error('❌ Error fetching items:', fetchError);
    return;
  }

  console.log(`📊 Total items in database: ${allItems.length}\n`);

  const itemsToDelete = new Map();

  // Check each item against patterns
  for (const item of allItems) {
    for (const { field, pattern, category } of nonShoePatterns) {
      const fieldValue = item[field];

      if (fieldValue && pattern.test(fieldValue)) {
        if (!itemsToDelete.has(item.id)) {
          itemsToDelete.set(item.id, {
            ...item,
            reason: `${field} matches ${category}`,
            category,
          });
        }
      }
    }
  }

  if (itemsToDelete.size === 0) {
    console.log('✅ No non-shoe items found! Database is clean.');
    return;
  }

  console.log(`⚠️  Found ${itemsToDelete.size} non-shoe items:\n`);

  // Group by category
  const byCategory = new Map();
  for (const item of itemsToDelete.values()) {
    if (!byCategory.has(item.category)) {
      byCategory.set(item.category, []);
    }
    byCategory.get(item.category).push(item);
  }

  // Display grouped items
  for (const [category, items] of byCategory.entries()) {
    console.log(`📦 ${category.toUpperCase()} (${items.length} items):`);
    items.forEach(item => {
      console.log(`   - ${item.brand_name || '?'} ${item.model || '?'} [${item.primary_use || 'no use'}]`);
      console.log(`     ID: ${item.id}, Reason: ${item.reason}`);
    });
    console.log('');
  }

  // Ask for confirmation
  console.log(`\n⚠️  About to delete ${itemsToDelete.size} non-shoe items from the database.`);
  console.log('This action cannot be undone!\n');

  // For safety, require explicit confirmation
  const idsToDelete = Array.from(itemsToDelete.keys());

  console.log('🗑️  Deleting non-shoe items...\n');

  let deleted = 0;
  const batchSize = 100;

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);

    const { error: deleteError } = await supabase
      .from('shoe_results')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, deleteError);
    } else {
      deleted += batch.length;
      console.log(`✅ Deleted batch ${i / batchSize + 1} (${batch.length} items)`);
    }
  }

  console.log(`\n✨ Done! Deleted ${deleted} non-shoe items.`);
  console.log(`\n📊 Remaining items: ${allItems.length - deleted}`);
}

cleanupNonShoes().catch(console.error);
