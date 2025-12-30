import { isLikelyShoeArticle, extractLightweightText, simulateLargeHtmlSkipped } from './extractor';
import assert from 'node:assert';

let passed = 0;
let failed = 0;

function runTest(name: string, testFn: () => void) {
  try {
    testFn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name}:`, err);
  }
}

// Test 1: Repetition cap
console.log('Test 1: Checking repetition cap...');
const repeatedText = 'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running ' +
                     'running running running running running running running running running running';

runTest('Test 1: Repetition cap', () => {
  const result = isLikelyShoeArticle(repeatedText);
  assert.strictEqual(result.ok, false, 'Should be false due to only generic low-value terms');
  assert(result.score < 100, `Score should be reasonable, got ${result.score}`);
});

// Test 2: Stricter anchors with negative dominance
console.log('\nTest 2: Checking anchor does not auto-pass with strong negatives...');
const anchorWithNegatives = `This shoe has a heel-to-toe drop of 8mm and stack height of 32mm.
But this article is also about bikes, cycling, and GPS watches.
We also discuss jackets and backpacks for running.
The shoe has a weight of 250g and costs $120.`;

runTest('Test 2: Anchor does not auto-pass with strong negatives', () => {
  const result = isLikelyShoeArticle(anchorWithNegatives);
  assert.strictEqual(result.ok, false, 'Anchor should not override negatives');
  assert(result.has_anchor, 'Should have anchor');
  assert(result.neg_hits.length > 0, 'Should have negative hits');
});

// Test 3: Normal case with shoe specs
console.log('\nTest 3: Normal shoe article with specs...');
const normalShoeText = `The Nike Pegasus 41 features a 10mm drop and weighs 285g.
The heel stack is 36mm and forefoot is 26mm.
The shoe has a carbon plate and is waterproof.
Price is $130.`;

runTest('Test 3: Normal shoe article with specs', () => {
  const result = isLikelyShoeArticle(normalShoeText);
  assert.strictEqual(result.ok, true, 'Should correctly identify shoe article');
  assert(result.has_anchor, 'Should have anchor');
  assert(result.pos_hits.length > 0, 'Should have positive hits');
  assert.strictEqual(result.neg_hits.length, 0, 'Should have no negative hits');
});

// Test 4: Large HTML simulation (just long text with mixed content)
console.log('\nTest 4: Simulating large HTML with shoe and non-shoe content...');
let largeText = '';
// Add some shoe content
largeText += 'The shoe has a drop of 8mm and weight of 250g. ';
// Add many non-shoe keywords
for (let i = 0; i < 50; i++) {
    largeText += 'bike cycling watch GPS jacket backpack ';
}
// Add more shoe content
largeText += 'The forefoot is 24mm and heel is 32mm. Price $140.';

runTest('Test 4: Large HTML with mixed content', () => {
  const result = isLikelyShoeArticle(largeText);
  assert.strictEqual(result.ok, false, 'Should reject due to negative dominance');
  assert(result.neg_hits.length > 0, 'Should have negative hits');
});

// Test 5: Prefilter for large_html (Fix #1)
console.log('\nTest 5: Prefilter for large_html...');
runTest('Test 5: Prefilter for large_html', () => {
  // Create HTML with shoe content (doesn't need to be >600k for unit test)
  const html = `
    <html>
      <body>
        <p>The running shoe has a heel-to-toe drop of 8mm and weighs 250g.</p>
        <p>Forefoot height is 24mm, heel is 32mm.</p>
        <p>Price: $120.</p>
      </body>
    </html>
  `;
  const title = 'Running shoe review';
  const contentLen = 0;
  const fetchedHtmlBytes = html.length;
  
  // Call simulateLargeHtmlSkipped with custom maxPrefilterChars for testing
  const result = simulateLargeHtmlSkipped(html, title, contentLen, fetchedHtmlBytes, 160000);
  
  // Check the structure matches large_html skipped case
  assert.strictEqual(result.mode, 'skipped', 'Should be skipped');
  assert.strictEqual(result.reason, 'large_html', 'Should be large_html reason');
  assert.strictEqual(result.stage, 'size_guard', 'Should be size_guard stage');
  
  // Verify prefilter telemetry is present (Fix #1)
  assert('prefilter_score' in result, 'Missing prefilter_score');
  assert('prefilter_has_anchor' in result, 'Missing prefilter_has_anchor');
  assert('prefilter_pos_hits' in result, 'Missing prefilter_pos_hits');
  assert('prefilter_neg_hits' in result, 'Missing prefilter_neg_hits');
  
  // Verify prefilter values match what we'd get from lightweight text
  const lightweightText = extractLightweightText(html, 160000);
  const prefilterResult = isLikelyShoeArticle(lightweightText);
  assert.strictEqual(result.prefilter_score, prefilterResult.score, 'prefilter_score mismatch');
  assert.strictEqual(result.prefilter_has_anchor, prefilterResult.has_anchor, 'prefilter_has_anchor mismatch');
  // Note: The hits arrays might be capped to 5 in the result, but we can check they are arrays
  assert(Array.isArray(result.prefilter_pos_hits), 'prefilter_pos_hits should be array');
  assert(Array.isArray(result.prefilter_neg_hits), 'prefilter_neg_hits should be array');
  
  // Additional check: if title had negative keywords, it would skip earlier
  const negativeTitle = 'Best GPS watches for running';
  const negativeResult = simulateLargeHtmlSkipped(html, negativeTitle, contentLen, fetchedHtmlBytes, 160000);
  assert.strictEqual(negativeResult.not_shoe_signal, 'title', 'Title prefilter should skip');
  assert.strictEqual(negativeResult.reason, 'not_shoe_article', 'Should be not_shoe_article');
});

// Summary
console.log(`\n=== Test Summary ===`);
console.log(`Passed: ${passed}, Failed: ${failed}`);

// Configuration details
console.log('\n=== Configuration Details ===');
console.log('Positive caps: 3 per term');
console.log('Negative caps: 3 per term');
console.log('Anchor bonus: +5 (does not auto-pass)');
console.log('Base score threshold: 8');
console.log('Negative score threshold: 6');

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
