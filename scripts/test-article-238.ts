// Test Article 238 German patterns
const text = `Testschuhe: 326g (Herren EUR 44,5)
Sprengung: 10 mm (28 mm Vorfuß / 38mm Ferse)`;

console.log('Testing German patterns:\n');

// Test weight
const germanOfficialMatch = text.match(/offiziell[:\s]+(\d{2,4})\s*g\b/i);
console.log('Weight pattern 1 (Offiziell):', germanOfficialMatch);

const germanWeightMatch = text.match(/gewicht[:\s]+(\d{2,4})\s*g\b/i);
console.log('Weight pattern 2 (Gewicht):', germanWeightMatch);

const testschuheMatch = text.match(/testschuhe[:\s]+(\d{2,4})\s*g/i);
console.log('Weight pattern 3 (Testschuhe):', testschuheMatch);

// Test stack height
const germanPattern = text.match(/(\d+(?:\.\d+)?)\s*mm\s+vorfuß[^0-9]+(\d+(?:\.\d+)?)\s*mm\s*ferse/i);
console.log('\nStack height pattern 1:', germanPattern);

const germanReversePattern = text.match(/(\d+(?:\.\d+)?)\s*mm\s*ferse[^0-9]+(\d+(?:\.\d+)?)\s*mm\s+vorfuß/i);
console.log('Stack height pattern 2:', germanReversePattern);

// Test drop
const germanDropMatch = text.match(/sprengung[:\s]+(\d+(?:\.\d+)?)\s*mm/i);
console.log('\nDrop pattern (Sprengung):', germanDropMatch);
