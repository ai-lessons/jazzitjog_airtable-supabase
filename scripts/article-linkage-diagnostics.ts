import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ensure Supabase connection details are available
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase connection details in .env');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runArticleLinkageDiagnostics() {
  try {
    // Total rows in shoe_results
    const { count: totalRows, error: totalRowsError } = await supabase
      .from('shoe_results')
      .select('*', { count: 'exact', head: true });

    if (totalRowsError) throw totalRowsError;
    const safeTotal = totalRows ?? 0;

    // Rows with article_id (text)
    const { count: textArticleIdRows, error: textArticleIdError } = await supabase
      .from('shoe_results')
      .select('*', { count: 'exact', head: true })
      .not('article_id', 'is', null);

    if (textArticleIdError) throw textArticleIdError;
    const safeTextRows = textArticleIdRows ?? 0;

    // Rows with article_id_int
    const { count: intArticleIdRows, error: intArticleIdError } = await supabase
      .from('shoe_results')
      .select('*', { count: 'exact', head: true })
      .not('article_id_int', 'is', null);

    if (intArticleIdError) throw intArticleIdError;
    const safeIntRows = intArticleIdRows ?? 0;

    // Rows matching JazzItJog_db.ID
    const { data: matchingRows, error: matchingRowsError } = await supabase
      .rpc('count_matching_article_ids');

    if (matchingRowsError) throw matchingRowsError;
    const safeMatchingRows = Number(matchingRows) || 0;

    // Rows NOT matching JazzItJog_db.ID
    const { data: unmatchedRows, error: unmatchedRowsError } = await supabase
      .rpc('count_unmatched_article_ids');

    if (unmatchedRowsError) throw unmatchedRowsError;
    const safeUnmatchedRows = Number(unmatchedRows) || 0;

    // Output results
    console.log('Article Linkage Diagnostics:');
    console.log(`Total rows in shoe_results: ${safeTotal}`);
    console.log(`Rows with article_id (text): ${safeTextRows}`);
    console.log(`Rows with article_id_int: ${safeIntRows}`);
    console.log(`Rows matching JazzItJog_db.ID: ${safeMatchingRows}`);
    console.log(`Rows NOT matching JazzItJog_db.ID: ${safeUnmatchedRows}`);

    // Recommendation based on matching percentage
    const matchPercentage = safeTotal > 0 
      ? (safeMatchingRows / safeTotal) * 100 
      : 0;
    
    console.log(`\nMatching Percentage: ${matchPercentage.toFixed(2)}%`);

    if (matchPercentage < 50) {
      console.warn('WARNING: Low article ID matching rate. Manual review recommended.');
    } else if (matchPercentage < 80) {
      console.log('CAUTION: Moderate article ID matching rate. Consider manual verification.');
    } else {
      console.log('SUCCESS: High article ID matching rate.');
    }

  } catch (error) {
    console.error('Error running article linkage diagnostics:', error);
    process.exit(1);
  }
}

runArticleLinkageDiagnostics();
