// Test German pattern
const text = "Sprengung: 10 mm (28 mm Vorfuß / 38mm Ferse)";

// Pattern from code
const germanPattern = text.match(/(\d+(?:\.\d+)?)\s*mm\s+vorfuß[^0-9]+(\d+(?:\.\d+)?)\s*mm\s*ferse/i);
console.log('Pattern 1 result:', germanPattern);

const germanReversePattern = text.match(/(\d+(?:\.\d+)?)\s*mm\s*ferse[^0-9]+(\d+(?:\.\d+)?)\s*mm\s+vorfuß/i);
console.log('Pattern 2 result:', germanReversePattern);

if (germanPattern) {
  console.log('Forefoot:', germanPattern[1]);
  console.log('Heel:', germanPattern[2]);
} else if (germanReversePattern) {
  console.log('Heel:', germanReversePattern[1]);
  console.log('Forefoot:', germanReversePattern[2]);
}
