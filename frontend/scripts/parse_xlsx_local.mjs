// Quick local parser to sanity-check an .xlsx file using Node
// Usage (PowerShell): node ./scripts/parse_xlsx_local.mjs "C:\\Users\\Bessar Farac\\OneDrive\\Documents\\HLP\\ref_system\\Kobo_v6 en.xlsx"

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

function validatePath(p) {
  if (!p) throw new Error('No file path provided');
  const ext = path.extname(p).toLowerCase();
  if (ext !== '.xlsx') throw new Error('Only .xlsx files are allowed');
  const stat = fs.statSync(p);
  if (!stat.isFile()) throw new Error('Not a file');
  const MAX_BYTES = 5 * 1024 * 1024;
  if (stat.size <= 0) throw new Error('File is empty');
  if (stat.size > MAX_BYTES) throw new Error('File is too large (max 5MB)');
}

async function main() {
  const [, , inputPath] = process.argv;
  validatePath(inputPath);
  const buf = fs.readFileSync(inputPath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  console.log(`Parsed: ${path.basename(inputPath)}`);
  console.log(`Sheet: ${sheetName}`);
  console.log(`Rows: ${rows.length}`);
  // Print first 3 rows for a glance
  console.log(JSON.stringify(rows.slice(0, 3), null, 2));
}

main().catch((err) => {
  console.error('Failed:', err.message || err);
  process.exit(1);
});
