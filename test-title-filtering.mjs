// Test title filtering with new logic
import { analyzeTitleForContext } from './dist/etl/extract/title_analysis.js';

const testTitles = [
  { title: "Garmin Venu X1 Sports Smartwatch: A Runner's Review", expected: 'irrelevant' },
  { title: "7 Best Winter Running Shoes in 2025", expected: 'general' },
  { title: "The 10 Best Winter Running Shoes For Icy, Snowy, and Slushy", expected: 'general' },
  { title: "Nike Pegasus 41 Review", expected: 'specific' },
  { title: "Лучшие беговые кроссовки 2025", expected: 'general' }, // Russian: Best running shoes 2025
  { title: "Adidas Running Socks - Top 5", expected: 'irrelevant' },
  { title: "Brooks Ghost 16 vs Ghost 17", expected: 'specific' },
  { title: "Best Treadmills for Home", expected: 'irrelevant' },
  { title: "Hoka Speedgoat 5 Trail Review", expected: 'specific' },
];

console.log('Testing title filtering:\n');

testTitles.forEach(({ title, expected }) => {
  const result = analyzeTitleForContext(title);
  const pass = result.scenario === expected ? '✅' : '❌';
  console.log(`${pass} "${title}"`);
  console.log(`   Expected: ${expected}, Got: ${result.scenario}\n`);
});
