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
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapping of brands to their canonical form
const brandNormalizations = {
  'asics': 'ASICS',
  'hoka': 'HOKA',
  'nike': 'Nike',
  'adidas': 'adidas',
  'new balance': 'New Balance',
  'brooks': 'Brooks',
  'saucony': 'Saucony',
  'altra': 'Altra',
  'on': 'On',
  'salomon': 'Salomon',
  'mizuno': 'Mizuno',
  'inov': 'inov-8',
  'inov-8': 'inov-8',
  'la sportiva': 'La Sportiva',
  'topo athletic': 'Topo Athletic',
  'merrell': 'Merrell',
  'reebok': 'Reebok',
  'under armour': 'Under Armour',
  'puma': 'PUMA',
  'the north face': 'The North Face',
  'scarpa': 'SCARPA',
  '361°': '361°',
  'karhu': 'Karhu',
  'craft': 'Craft',
};

async function normalizeBrands() {
  console.log('🔍 Fetching all unique brand names...');

  const { data: brands, error: fetchError } = await supabase
    .from('shoe_results')
    .select('brand_name')
    .not('brand_name', 'is', null);

  if (fetchError) {
    console.error('❌ Error fetching brands:', fetchError);
    return;
  }

  // Get unique brands (case-insensitive)
  const uniqueBrands = new Map();
  brands.forEach(({ brand_name }) => {
    if (brand_name) {
      const lower = brand_name.toLowerCase().trim();
      if (!uniqueBrands.has(lower)) {
        uniqueBrands.set(lower, []);
      }
      uniqueBrands.get(lower).push(brand_name);
    }
  });

  console.log(`\n📊 Found ${uniqueBrands.size} unique brand names (case-insensitive)\n`);

  // Show duplicates
  const duplicates = Array.from(uniqueBrands.entries())
    .filter(([_, variants]) => variants.length > 1);

  if (duplicates.length > 0) {
    console.log('⚠️  Found case-sensitive duplicates:');
    duplicates.forEach(([lower, variants]) => {
      console.log(`  ${lower}: ${[...new Set(variants)].join(', ')}`);
    });
  }

  console.log('\n🔄 Normalizing brand names...\n');

  let updated = 0;
  for (const [lowerBrand, variants] of uniqueBrands.entries()) {
    const canonical = brandNormalizations[lowerBrand] ||
                     variants[0]; // Use first variant if no mapping exists

    // Update all variants to canonical form
    const uniqueVariants = [...new Set(variants)];
    for (const variant of uniqueVariants) {
      if (variant !== canonical) {
        const { data, error: updateError } = await supabase
          .from('shoe_results')
          .update({ brand_name: canonical })
          .eq('brand_name', variant)
          .select('id');

        if (updateError) {
          console.error(`❌ Error updating ${variant} -> ${canonical}:`, updateError);
        } else {
          const count = data?.length || 0;
          console.log(`✅ Updated: "${variant}" -> "${canonical}" (${count} rows)`);
          updated += count;
        }
      }
    }
  }

  console.log(`\n✨ Done! Updated ${updated} rows.`);
}

normalizeBrands().catch(console.error);
