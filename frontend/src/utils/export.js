// Utility to export cases to XLSX including comments, final status, and completedBy staff
import * as XLSX from 'xlsx';

function formatComments(comments = []) {
  if (!Array.isArray(comments) || !comments.length) return '';
  return comments
    .map((c) => `${new Date(c.timestamp).toISOString()} | ${c.author}: ${c.text}`)
    .join('\n');
}

// Flatten an object (including nested objects) to dot notation for XLSX rows
function flattenObject(obj, prefix = '') {
  const res = {};
  Object.entries(obj || {}).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(res, flattenObject(value, fullKey));
    } else if (Array.isArray(value)) {
      // Join arrays into string; for comments use formatted string
      if (key === 'comments') {
        res[fullKey] = formatComments(value);
      } else {
        res[fullKey] = value.join(', ');
      }
    } else {
      res[fullKey] = value ?? '';
    }
  });
  return res;
}

export function buildCaseRows(cases = []) {
  return cases.map((c) => {
    const base = {
      CaseID: c.recordId || c.caseNumber || c.case_id || c.key,
      FinalStatus: c.status || 'Pending',
      Comments: formatComments(c.comments),
    };
    const flattened = flattenObject(c);
    // Ensure key fields present while including all metadata
    return { ...flattened, ...base };
  });
}

export function exportCasesToXLSX(cases = [], filename = 'cases.xlsx') {
  const rows = buildCaseRows(cases);
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Cases');
  XLSX.writeFile(wb, filename);
}
