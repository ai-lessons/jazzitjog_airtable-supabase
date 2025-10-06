// Validate extraction quality by comparing with ground truth
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

interface ExtractedRow {
  article_id: string;
  article_title: string;
  brand_name: string;
  model: string;
  primary_use: string;
  cushioning_type: string;
  weight: string;
  foot_width: string;
  heel_height: string;
  drop: string;
  waterproof: string;
}

interface GroundTruthRow {
  article_id: string;
  brand_name: string;
  model: string;
  primary_use_CORRECT: string;
  cushioning_type_CORRECT: string;
  weight_CORRECT: string;
  foot_width_CORRECT: string;
  heel_height_CORRECT: string;
  drop_CORRECT: string;
  waterproof_CORRECT: string;
  notes: string;
}

interface FieldMetrics {
  total: number;
  correct: number;
  incorrect: number;
  missing_extracted: number;
  missing_ground_truth: number;
  accuracy: number;
  recall: number;
  precision: number;
}

const CRITICAL_FIELDS = [
  'primary_use',
  'cushioning_type',
  'weight',
  'foot_width',
  'heel_height',
  'drop',
  'waterproof',
];

function normalizeValue(value: string | null | undefined): string {
  if (!value || value === '' || value === 'null' || value === 'undefined' || value === 'FALSE') return '';
  return String(value).trim().toLowerCase();
}

function compareValues(extracted: string, groundTruth: string): 'correct' | 'incorrect' | 'missing_extracted' | 'missing_gt' {
  const ext = normalizeValue(extracted);
  const gt = normalizeValue(groundTruth);

  if (gt === '' && ext === '') return 'correct'; // Both empty = not applicable
  if (gt === '') return 'missing_gt'; // Ground truth not provided
  if (ext === '') return 'missing_extracted'; // Failed to extract

  // For numbers, allow small tolerance
  const extNum = parseFloat(ext);
  const gtNum = parseFloat(gt);
  if (!isNaN(extNum) && !isNaN(gtNum)) {
    return Math.abs(extNum - gtNum) <= 0.5 ? 'correct' : 'incorrect';
  }

  // For booleans
  if ((ext === 'true' || ext === 'false') && (gt === 'true' || gt === 'false')) {
    return ext === gt ? 'correct' : 'incorrect';
  }

  // For strings, check if extracted contains ground truth or vice versa
  if (ext.includes(gt) || gt.includes(ext)) return 'correct';

  return 'incorrect';
}

async function validateExtractionQuality(extractedCsv: string, groundTruthCsv: string) {
  console.log('📊 Validation Report\n');
  console.log('━'.repeat(80));

  // Read CSV files
  const extractedData = parse(readFileSync(extractedCsv, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
  }) as ExtractedRow[];

  const groundTruthData = parse(readFileSync(groundTruthCsv, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
  }) as GroundTruthRow[];

  console.log(`\n📥 Data loaded:`);
  console.log(`   Extracted rows: ${extractedData.length}`);
  console.log(`   Ground truth rows: ${groundTruthData.length}\n`);

  // Create lookup map
  const gtMap = new Map(
    groundTruthData.map(row => [`${row.article_id}_${row.brand_name}_${row.model}`, row])
  );

  // Calculate metrics per field
  const fieldMetrics: Record<string, FieldMetrics> = {};

  CRITICAL_FIELDS.forEach(field => {
    fieldMetrics[field] = {
      total: 0,
      correct: 0,
      incorrect: 0,
      missing_extracted: 0,
      missing_ground_truth: 0,
      accuracy: 0,
      recall: 0,
      precision: 0,
    };
  });

  const errors: Array<{
    article_id: string;
    shoe: string;
    field: string;
    extracted: string;
    expected: string;
    status: string;
  }> = [];

  // Compare each row
  for (const extracted of extractedData) {
    const key = `${extracted.article_id}_${extracted.brand_name}_${extracted.model}`;
    const groundTruth = gtMap.get(key);

    if (!groundTruth) {
      console.log(`⚠️  No ground truth for: ${extracted.brand_name} ${extracted.model} (Article ${extracted.article_id})`);
      continue;
    }

    for (const field of CRITICAL_FIELDS) {
      const extractedValue = extracted[field as keyof ExtractedRow] || '';
      const gtValue = groundTruth[`${field}_CORRECT` as keyof GroundTruthRow] || '';

      const status = compareValues(extractedValue, gtValue);
      fieldMetrics[field].total++;

      if (status === 'correct') {
        fieldMetrics[field].correct++;
      } else if (status === 'incorrect') {
        fieldMetrics[field].incorrect++;
        errors.push({
          article_id: extracted.article_id,
          shoe: `${extracted.brand_name} ${extracted.model}`,
          field,
          extracted: extractedValue || 'NULL',
          expected: gtValue || 'NULL',
          status: 'incorrect',
        });
      } else if (status === 'missing_extracted') {
        fieldMetrics[field].missing_extracted++;
        errors.push({
          article_id: extracted.article_id,
          shoe: `${extracted.brand_name} ${extracted.model}`,
          field,
          extracted: 'NULL',
          expected: gtValue || 'NULL',
          status: 'missing',
        });
      } else if (status === 'missing_gt') {
        fieldMetrics[field].missing_ground_truth++;
      }
    }
  }

  // Calculate percentages
  Object.keys(fieldMetrics).forEach(field => {
    const m = fieldMetrics[field];
    const total = m.total;
    if (total > 0) {
      m.accuracy = (m.correct / total) * 100;
      m.recall = (m.correct / (m.correct + m.missing_extracted)) * 100 || 0;
      m.precision = (m.correct / (m.correct + m.incorrect)) * 100 || 0;
    }
  });

  // Print results
  console.log('━'.repeat(80));
  console.log('\n📈 Field-by-Field Metrics:\n');

  CRITICAL_FIELDS.forEach(field => {
    const m = fieldMetrics[field];
    const symbol = m.accuracy >= 80 ? '✅' : m.accuracy >= 60 ? '⚠️ ' : '❌';

    console.log(`${symbol} ${field.toUpperCase()}`);
    console.log(`   Total samples: ${m.total}`);
    console.log(`   ✓ Correct: ${m.correct} (${m.accuracy.toFixed(1)}%)`);
    console.log(`   ✗ Incorrect: ${m.incorrect}`);
    console.log(`   ∅ Missing (extracted): ${m.missing_extracted}`);
    console.log(`   Precision: ${m.precision.toFixed(1)}%`);
    console.log(`   Recall: ${m.recall.toFixed(1)}%`);
    console.log('');
  });

  // Overall metrics
  const overallCorrect = Object.values(fieldMetrics).reduce((sum, m) => sum + m.correct, 0);
  const overallTotal = Object.values(fieldMetrics).reduce((sum, m) => sum + m.total, 0);
  const overallAccuracy = (overallCorrect / overallTotal) * 100;

  console.log('━'.repeat(80));
  console.log('\n📊 Overall Summary:\n');
  console.log(`   Total validations: ${overallTotal}`);
  console.log(`   Overall accuracy: ${overallAccuracy.toFixed(1)}%`);
  console.log(`   Shoes validated: ${extractedData.length}`);
  console.log('');

  // Print top errors
  console.log('━'.repeat(80));
  console.log('\n❌ Top 20 Errors:\n');

  errors.slice(0, 20).forEach((err, idx) => {
    console.log(`[${idx + 1}] Article ${err.article_id} - ${err.shoe}`);
    console.log(`    Field: ${err.field}`);
    console.log(`    Extracted: "${err.extracted}"`);
    console.log(`    Expected:  "${err.expected}"`);
    console.log(`    Status: ${err.status}`);
    console.log('');
  });

  console.log('━'.repeat(80));
  console.log(`\n💾 Total errors: ${errors.length} (showing top 20)`);

  // Error patterns
  console.log('\n━'.repeat(80));
  console.log('\n🔍 Error Patterns:\n');

  const errorsByField = new Map<string, number>();
  errors.forEach(err => {
    errorsByField.set(err.field, (errorsByField.get(err.field) || 0) + 1);
  });

  const sortedErrors = [...errorsByField.entries()].sort((a, b) => b[1] - a[1]);
  sortedErrors.forEach(([field, count]) => {
    console.log(`   ${field}: ${count} errors`);
  });

  console.log('\n━'.repeat(80));
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: tsx validate-extraction-quality.ts <extracted.csv> <ground-truth.csv>');
  process.exit(1);
}

validateExtractionQuality(args[0], args[1]).catch(console.error);
