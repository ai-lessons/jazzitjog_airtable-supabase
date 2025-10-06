// Convert XLSX to CSV
import * as XLSX from 'xlsx';
import { writeFileSync } from 'fs';

const workbook = XLSX.readFile('validation-ground-truth.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const csv = XLSX.utils.sheet_to_csv(worksheet);

writeFileSync('validation-ground-truth.csv', csv, 'utf-8');
console.log('✅ Converted validation-ground-truth.xlsx to CSV');
