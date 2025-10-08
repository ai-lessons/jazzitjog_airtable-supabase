// Test title analysis for Article 274
import { analyzeTitleForContext } from './src/etl/extract/title_analysis.ts';

const title = "The 10 Best Winter Running Shoes For Icy, Snowy, and Slushy Cold-Weather Runs";

console.log('📋 Title:', title);
console.log('\n🔍 Title Analysis:');

const analysis = analyzeTitleForContext(title);
console.log(JSON.stringify(analysis, null, 2));

console.log('\n💡 Expected Behavior:');
console.log('  - Scenario: "general" (roundup article)');
console.log('  - Should extract: ~10 shoe models');
console.log('  - Should NOT filter by specific brand/model');
