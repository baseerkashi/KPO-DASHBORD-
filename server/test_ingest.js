import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { detectColumns, parseNumericRows, computeFinancials, computeRisk } from './analysis.js';

try {
  const text = fs.readFileSync('../data/sample-var-15-edtech-boom.csv', 'utf8');
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
  const headers = Object.keys(records[0]);
  const columnKeys = detectColumns(headers);
  const parsed = parseNumericRows(records, columnKeys);
  
  if (parsed.error) {
    console.error("Parsed error:", parsed.error);
    process.exit(1);
  }
  
  console.log("Upload logic success.");
  
  const financials = computeFinancials(parsed.rows);
  const risk = computeRisk(parsed.rows, financials);
  console.log("Analyze logic success.");
} catch (e) {
  console.error("Caught error:", e);
}
