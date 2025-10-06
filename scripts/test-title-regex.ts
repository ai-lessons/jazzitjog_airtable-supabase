// Test title regex patterns
const title = "We Love to Train and Race in These 6 Adidas Running Shoes";
const normalized = title.toLowerCase().trim();

console.log('Original title:', title);
console.log('Normalized:', normalized);
console.log('\n');

// Test brand detection
const brands = ['nike', 'adidas', 'hoka', 'asics', 'brooks', 'saucony', 'new balance', 'salomon', 'altra', 'on', 'mizuno'];

for (const brand of brands) {
  if (normalized.includes(brand)) {
    console.log(`✅ Brand "${brand}" found in normalized title`);

    // Check model number pattern
    const hasModelNumber = /\b[a-z]+\s+\d+/.test(normalized);
    console.log(`   Has model number pattern: ${hasModelNumber}`);

    // Check brand focus pattern
    const hasBrandFocus = new RegExp(`\\b\\d+\\s+${brand}|${brand}\\s+(?:running\\s+)?shoes?|best\\s+${brand}|top\\s+${brand}`, 'i').test(normalized);
    console.log(`   Has brand focus pattern: ${hasBrandFocus}`);

    // Test the actual pattern
    const pattern = new RegExp(`\\b\\d+\\s+${brand}|${brand}\\s+(?:running\\s+)?shoes?|best\\s+${brand}|top\\s+${brand}`, 'i');
    const match = normalized.match(pattern);
    console.log(`   Pattern match:`, match ? match[0] : null);

    console.log('\n');
  }
}
