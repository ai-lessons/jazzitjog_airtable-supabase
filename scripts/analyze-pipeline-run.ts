// Analyze pipeline run results
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyze() {
  console.log('📊 Analyzing pipeline run results\n');
  console.log('━'.repeat(80));

  // Get records from last run
  const { data: recentRecords, error } = await client
    .from('shoe_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  // Group by article_id
  const byArticle = new Map<string, any[]>();
  recentRecords.forEach(record => {
    const artId = record.article_id;
    if (!byArticle.has(artId)) {
      byArticle.set(artId, []);
    }
    byArticle.get(artId)!.push(record);
  });

  console.log(`\n📦 Found ${recentRecords.length} recent records from ${byArticle.size} articles\n`);

  // Analyze each article
  const report = {
    totalArticles: byArticle.size,
    totalShoes: recentRecords.length,
    articles: [] as any[],
    fieldCoverage: {
      weight: 0,
      drop: 0,
      price: 0,
      heel_height: 0,
      forefoot_height: 0,
      primary_use: 0,
      surface_type: 0,
      cushioning_type: 0,
    },
    issues: [] as string[],
  };

  byArticle.forEach((shoes, articleId) => {
    console.log(`📄 Article ${articleId}:`);
    console.log(`   Shoes extracted: ${shoes.length}`);

    // Check brands
    const brands = new Set(shoes.map(s => s.brand_name));
    console.log(`   Brands: ${Array.from(brands).join(', ')}`);

    // Check field coverage
    const withWeight = shoes.filter(s => s.weight !== null).length;
    const withDrop = shoes.filter(s => s.drop !== null).length;
    const withPrice = shoes.filter(s => s.price !== null).length;

    console.log(`   Field coverage:`);
    console.log(`      Weight: ${withWeight}/${shoes.length} (${Math.round(withWeight/shoes.length*100)}%)`);
    console.log(`      Drop: ${withDrop}/${shoes.length} (${Math.round(withDrop/shoes.length*100)}%)`);
    console.log(`      Price: ${withPrice}/${shoes.length} (${Math.round(withPrice/shoes.length*100)}%)`);

    // Update totals
    report.fieldCoverage.weight += withWeight;
    report.fieldCoverage.drop += withDrop;
    report.fieldCoverage.price += withPrice;
    report.fieldCoverage.heel_height += shoes.filter(s => s.heel_height !== null).length;
    report.fieldCoverage.forefoot_height += shoes.filter(s => s.forefoot_height !== null).length;
    report.fieldCoverage.primary_use += shoes.filter(s => s.primary_use !== null).length;
    report.fieldCoverage.surface_type += shoes.filter(s => s.surface_type !== null).length;
    report.fieldCoverage.cushioning_type += shoes.filter(s => s.cushioning_type !== null).length;

    // Check for potential issues
    const issues: string[] = [];

    // Issue 1: Multiple brands in brand-specific article
    if (brands.size > 2) {
      issues.push(`Multiple brands (${brands.size}): ${Array.from(brands).join(', ')}`);
    }

    // Issue 2: Very low field coverage
    if (withWeight === 0 && withDrop === 0 && withPrice === 0) {
      issues.push('No physical specs extracted (weight, drop, price all null)');
    }

    // Issue 3: Duplicate model_keys
    const modelKeys = shoes.map(s => s.model_key);
    const duplicates = modelKeys.filter((key, idx) => modelKeys.indexOf(key) !== idx);
    if (duplicates.length > 0) {
      issues.push(`Duplicate model_keys: ${duplicates.join(', ')}`);
    }

    if (issues.length > 0) {
      console.log(`   ⚠️  Issues:`);
      issues.forEach(issue => console.log(`      - ${issue}`));
      report.issues.push(...issues.map(i => `Article ${articleId}: ${i}`));
    }

    report.articles.push({
      article_id: articleId,
      shoes_count: shoes.length,
      brands: Array.from(brands),
      coverage: {
        weight: withWeight,
        drop: withDrop,
        price: withPrice,
      },
      issues,
    });

    console.log('');
  });

  console.log('━'.repeat(80));
  console.log('\n📈 Overall Statistics:\n');
  console.log(`Total Articles: ${report.totalArticles}`);
  console.log(`Total Shoes: ${report.totalShoes}`);
  console.log(`Average Shoes/Article: ${Math.round(report.totalShoes / report.totalArticles * 10) / 10}`);
  console.log('');
  console.log('Field Coverage:');
  console.log(`  Weight: ${report.fieldCoverage.weight}/${report.totalShoes} (${Math.round(report.fieldCoverage.weight/report.totalShoes*100)}%)`);
  console.log(`  Drop: ${report.fieldCoverage.drop}/${report.totalShoes} (${Math.round(report.fieldCoverage.drop/report.totalShoes*100)}%)`);
  console.log(`  Price: ${report.fieldCoverage.price}/${report.totalShoes} (${Math.round(report.fieldCoverage.price/report.totalShoes*100)}%)`);
  console.log(`  Heel Height: ${report.fieldCoverage.heel_height}/${report.totalShoes} (${Math.round(report.fieldCoverage.heel_height/report.totalShoes*100)}%)`);
  console.log(`  Primary Use: ${report.fieldCoverage.primary_use}/${report.totalShoes} (${Math.round(report.fieldCoverage.primary_use/report.totalShoes*100)}%)`);

  if (report.issues.length > 0) {
    console.log('\n⚠️  Issues Found:\n');
    report.issues.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue}`);
    });
  } else {
    console.log('\n✅ No issues found!');
  }

  // Save report
  const reportPath = join(process.cwd(), 'pipeline-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: pipeline-report.json`);
}

analyze().catch(console.error);
