// Test updated pattern for "Vorfu" without umlaut
const text = "Sprengung: 10 mm (28 mm Vorfu / 38mm Ferse)";

console.log('Testing updated pattern on text:', text);

// Updated pattern - handles "Vorfuß", "Vorfus", "Vorfu"
const germanPattern = text.match(/(\d+(?:\.\d+)?)\s*mm\s+vorfu[ßs]?[^0-9]+(\d+(?:\.\d+)?)\s*mm\s*ferse/i);
console.log('Pattern result:', germanPattern);

if (germanPattern) {
  console.log('✅ Forefoot:', germanPattern[1], 'mm');
  console.log('✅ Heel:', germanPattern[2], 'mm');
} else {
  console.log('❌ Pattern did not match');
}
