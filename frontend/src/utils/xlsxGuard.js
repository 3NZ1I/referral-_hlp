// Lightweight frontend safeguards for XLSX file handling
// Usage: import { validateXlsxFile } from './utils/xlsxGuard';
// Call validateXlsxFile(file) before parsing; it throws on invalid input.

const MAX_BYTES = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Some browsers provide a generic type; we rely on extension fallback below
]);

export function validateXlsxFile(file) {
  if (!file) throw new Error('No file provided');
  const name = file.name || '';
  const size = typeof file.size === 'number' ? file.size : 0;
  const type = file.type || '';

  if (!name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Only .xlsx files are allowed');
  }
  if (size <= 0) {
    throw new Error('File is empty');
  }
  if (size > MAX_BYTES) {
    throw new Error('File is too large (max 5MB)');
  }
  // If browser reports a specific MIME type, enforce it
  if (type && !ALLOWED_TYPES.has(type)) {
    // Allow common generic types but warn the caller
    const genericTypes = ['application/octet-stream'];
    if (!genericTypes.includes(type)) {
      throw new Error('Unexpected file type');
    }
  }
}

export function safeSheetSelection(workbook, allowedSheetNames = []) {
  // Limit which sheets can be read; returns filtered names
  const names = Array.isArray(workbook?.SheetNames) ? workbook.SheetNames : [];
  if (!allowedSheetNames || allowedSheetNames.length === 0) return names.slice(0, 1);
  return names.filter((n) => allowedSheetNames.includes(n));
}
