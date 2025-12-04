import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as XLSX from 'xlsx';
import { message } from 'antd';
import { formSections, caseFieldMapping } from '../data/formMetadata';
import { useAuth } from './AuthContext';
import { validateXlsxFile } from '../utils/xlsxGuard';

// ========================================================================
// ARCHIVED CODE - OLD NORMALIZATION APPROACH (kept for reference)
// ========================================================================
/*
const normalizeKey_ARCHIVED = (key = '') => key
  .toString()
  .trim()
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\p{M}]+/gu, '')
  .replace(/[^\p{L}\p{N}]+/gu, '');

const normalizeRowObject_ARCHIVED = (row) => {
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    if (!key) return;
    if (value === undefined || value === null) return;
    const cleanedKey = normalizeKey(key);
    normalized[cleanedKey] = typeof value === 'string' ? value.toString().trim() : value;
  });
  return normalized;
};

const pickValue_ARCHIVED = (normalizedRow, aliases, fallback = '') => {
  for (const alias of aliases) {
    if (normalizedRow[alias] !== undefined && normalizedRow[alias] !== '') {
      return normalizedRow[alias];
    }
  }
  return fallback;
};

const resolveFieldValue_ARCHIVED = (normalizedRow, canonicalName, fallback = '') => {
  const aliases = fieldAliasIndex[canonicalName] || [normalizeKey(canonicalName)];
  const value = pickValue(normalizedRow, aliases, fallback);
  if (value !== '' && value !== undefined) return value;
  
  const normalizedCanonical = normalizeKey(canonicalName);
  if (normalizedRow[normalizedCanonical] !== undefined && normalizedRow[normalizedCanonical] !== '') {
    return normalizedRow[normalizedCanonical];
  }
  
  return fallback;
};

const mapCanonicalFields_ARCHIVED = (normalizedRow) => {
  const acc = {};
  Object.keys(fieldAliasIndex).forEach((canonicalName) => {
    let value = resolveFieldValue(normalizedRow, canonicalName, undefined);

    if ((value === undefined || value === '') && canonicalName === 'beneficiary_name') {
      // Debug: beneficiary_name fallback check
      const alt = normalizedRow.beneficiary_name;
      if (alt !== undefined && alt !== '') value = alt;
    }
    if ((value === undefined || value === '') && canonicalName === 'beneficiary_last_name') {
      // Debug: beneficiary_last_name fallback check
      const alt = normalizedRow.beneficiary_last_name;
      if (alt !== undefined && alt !== '') value = alt;
    }

    if (value !== undefined && value !== '') {
      acc[canonicalName] = value;
    }
  });
  
  // Debug: Canonical field mapping complete
  
  return acc;
};
*/
// ========================================================================
// END OF ARCHIVED CODE
// ========================================================================

// NEW APPROACH: Simpler normalization that preserves original keys
const normalizeKey = (key = '') => {
  if (!key || typeof key !== 'string') return '';
  // Only strip HTML, trim, and lowercase - preserve underscores and structure
  return stripHtml(key).trim().toLowerCase();
};

const stripHtml = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ');

const rosterLabelSuffixIndex = (() => {
  const entries = [
    ['صلة القرابة', '_partner_relation1'],
    ['kinship ties', '_partner_relation1'],
    ['مسجل في الأحوال المدنية', '_partner_govreg'],
    ['registered in civil registry', '_partner_govreg'],
    ['الاسم', '_partner_name'],
    ['الأسم', '_partner_name'],
    ['name', '_partner_name'],
    ['اللقب', '_partner_lastname'],
    ['last name', '_partner_lastname'],
    ['title', '_partner_lastname'],
    ['تاريخ الميلاد', '_partner'],
    ['date of birth', '_partner'],
    ['الجنسية', '_partner_nationality'],
    ['nationality', '_partner_nationality'],
  ];
  return entries.reduce((acc, [label, suffix]) => {
    acc[normalizeKey(label)] = suffix;
    return acc;
  }, {});
})();

const remapRosterHeader = (rawCell = '') => {
  if (typeof rawCell !== 'string') return null;
  const stripped = stripHtml(rawCell).trim();
  const match = stripped.match(/(partnernu1_[^\s-:]+)[\s-:]+(.+)/i);
  if (!match) return null;
  const slotPart = match[1].replace(/\s+/g, '');
  const labelPart = match[2].replace(/[_*]/g, '').trim();
  const suffix = rosterLabelSuffixIndex[normalizeKey(labelPart)];
  if (!suffix) return null;
  return `group_fj2tt69_${slotPart}${suffix}`;
};

const collectLabelAliases = (label = {}) => {
  if (!label || typeof label !== 'object') return [];
  const locales = ['en', 'ar'];
  return locales.map((locale) => {
    const raw = label[locale];
    if (!raw || typeof raw !== 'string') return '';
    return stripHtml(raw).trim();
  }).filter(Boolean);
};

const buildAliasIndex = (sections = []) => {
  const index = {};
  sections.forEach((section) => {
    section.fields.forEach((field) => {
      const aliasSources = [field.name, ...(field.aliases || []), ...collectLabelAliases(field.label)];
      const aliases = [...new Set(aliasSources.map(normalizeKey).filter(Boolean))];
      if (aliases.length) {
        index[field.name] = aliases;
      }
    });
  });
  return index;
};

const buildCaseFieldAliasIndex = (mapping = {}) => Object.entries(mapping).reduce((acc, [target, rawAliases]) => {
  acc[target] = [target, ...(rawAliases || [])].map(normalizeKey).filter(Boolean);
  return acc;
}, {});

const fieldAliasIndex = buildAliasIndex(formSections);
const caseFieldAliasIndex = buildCaseFieldAliasIndex(caseFieldMapping);

const buildAliasToCanonicalIndex = (aliasIndex = {}) => Object.entries(aliasIndex).reduce((acc, [canonical, aliases]) => {
  (aliases || []).forEach((alias) => {
    if (!acc[alias]) acc[alias] = canonical;
  });
  return acc;
}, {});

const aliasToCanonicalIndex = (() => {
  const fieldMap = buildAliasToCanonicalIndex(fieldAliasIndex);
  const caseMap = buildAliasToCanonicalIndex(caseFieldAliasIndex);
  Object.entries(caseMap).forEach(([alias, canonical]) => {
    if (!fieldMap[alias]) {
      fieldMap[alias] = canonical;
    }
  });
  return fieldMap;
})();

const flattenAliasValues = (aliasMap = {}) => Object.values(aliasMap).reduce((acc, aliases) => {
  aliases.forEach((alias) => acc.add(alias));
  return acc;
}, new Set());

const knownHeaderKeys = (() => {
  const aliases = flattenAliasValues(fieldAliasIndex);
  flattenAliasValues(caseFieldAliasIndex).forEach((alias) => aliases.add(alias));
  ['_id', '_uuid', '_submission_time', '_submissiontime', '_submitted_by', '_last_edited', '_notes'].forEach((key) => aliases.add(normalizeKey(key)));
  return aliases;
})();

const dataTypeTokens = new Set([
  'text',
  'note',
  'select_one',
  'select_multiple',
  'geopoint',
  'integer',
  'decimal',
  'date',
  'datetime',
  'time',
  'calculate',
  'acknowledge',
  'rank',
  'barcode',
  'begin_group',
  'end_group',
  'begin_repeat',
  'end_repeat',
  'image',
  'audio',
  'video',
].map((token) => normalizeKey(token)));

const detectHeaderRowIndex = (rows = []) => {
  if (!rows.length) return 0;
  const lookahead = Math.min(rows.length, 10);
  let bestIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < lookahead; i += 1) {
    const row = rows[i] || [];
    const normalizedCells = row.map((cell) => normalizeKey(cell));
    let aliasHits = 0;
    let penalties = 0;
    normalizedCells.forEach((cell) => {
      if (!cell) return;
      if (knownHeaderKeys.has(cell)) aliasHits += 1;
      if (dataTypeTokens.has(cell)) penalties += 1;
    });
    const uniqueValues = new Set(normalizedCells.filter(Boolean)).size;
    const score = aliasHits * 2 + uniqueValues * 0.1 - penalties;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
};

const normalizeCaseNumberValue = (value) => {
  if (value === undefined || value === null) return '';
  return normalizeKey(value);
};

const seedDatasetKey = 'seed-1';

const initialCases = [
  { key: `${seedDatasetKey}-1`, datasetKey: seedDatasetKey, datasetName: 'Seed Dataset', status: 'Completed', caseNumber: 'SYR-2024-00125', assignedStaff: 'Admin User', followUpDate: '11/29/2025', notes: 'Case closed, proper' },
  { key: `${seedDatasetKey}-2`, datasetKey: seedDatasetKey, datasetName: 'Seed Dataset', status: 'In Progress', caseNumber: 'SYR-2024-00124', assignedStaff: 'Internal User', followUpDate: '12/5/2025', notes: 'Tenant seeking lega' },
  { key: `${seedDatasetKey}-3`, datasetKey: seedDatasetKey, datasetName: 'Seed Dataset', status: 'Pending', caseNumber: 'SYR-2024-00123', assignedStaff: 'External User', followUpDate: '12/10/2025', notes: 'Needs legal suppor' },
  { key: `${seedDatasetKey}-4`, datasetKey: seedDatasetKey, datasetName: 'Seed Dataset', status: 'Pending', caseNumber: 'SYR-2024-00126', assignedStaff: 'Admin User', followUpDate: '12/15/2025', notes: 'Neighbor dispute c' },
];

const initialDatasets = [
  {
    key: seedDatasetKey,
    recordId: 'UPL-2024-0000',
    fileName: 'Seed Dataset',
    entries: initialCases.length,
    uploadedBy: 'System',
    uploadedOn: '11/15/2025',
    status: 'Validated',
    rows: initialCases,
  },
];

const CasesContext = createContext(null);

// NEW: Direct field mapping - no lossy normalization
const mapFieldsFromRow = (rawRow) => {
  const result = {};
  
  // Build a lookup table from raw row keys (cleaned but preserving structure)
  const rowLookup = {};
  Object.entries(rawRow).forEach(([key, value]) => {
    if (!key || value === undefined || value === null || value === '') return;
    const cleanKey = normalizeKey(key);
    rowLookup[cleanKey] = typeof value === 'string' ? value.trim() : value;
  });
  
  // Available keys count: Object.keys(rowLookup).length
  
  // For each canonical field, try all possible aliases
  formSections.forEach((section) => {
    section.fields.forEach((field) => {
      const canonicalName = field.name;
      const allAliases = [
        canonicalName,
        ...(field.aliases || []),
        ...collectLabelAliases(field.label)
      ];
      
      // Try each alias
      for (const alias of allAliases) {
        const cleanAlias = normalizeKey(alias);
        if (rowLookup[cleanAlias] !== undefined) {
          result[canonicalName] = rowLookup[cleanAlias];
          
          // Log successful matches for debugging
          if (['staff_name', 'work_location', 'beneficiary_birth_place', 'ben_gender', 
               'beneficiary_civil_status', 'id_question', 'id_kind', 'owner_id_get',
               'owner_id_get_reason', 'fam_docs', 'main_number', 'back_number',
               'last_visit_date', 'last_stay_date', 'can_access', 'idps', 'yes_idps'].includes(canonicalName)) {
            // Match found for ${canonicalName}
          }
          
          break; // Stop after first match
        }
      }
    });
  });
  
  return result;
};

const normalizeRowObject = (row) => {
  // ARCHIVED - keeping for compatibility with existing code that calls this
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    if (!key) return;
    if (value === undefined || value === null) return;
    const cleanedKey = normalizeKey(key);
    normalized[cleanedKey] = typeof value === 'string' ? value.toString().trim() : value;
  });
  return normalized;
};

const pickValue = (normalizedRow, aliases, fallback = '') => {
  for (const alias of aliases) {
    if (normalizedRow[alias] !== undefined && normalizedRow[alias] !== '') {
      return normalizedRow[alias];
    }
  }
  return fallback;
};

const resolveFieldValue = (normalizedRow, canonicalName, fallback = '') => {
  const aliases = fieldAliasIndex[canonicalName] || [normalizeKey(canonicalName)];
  const value = pickValue(normalizedRow, aliases, fallback);
  if (value !== '' && value !== undefined) return value;
  
  // FALLBACK: Try the normalized version of the canonical name (without underscores)
  const normalizedCanonical = normalizeKey(canonicalName);
  if (normalizedRow[normalizedCanonical] !== undefined && normalizedRow[normalizedCanonical] !== '') {
    return normalizedRow[normalizedCanonical];
  }
  
  return fallback;
};

const resolveCaseFieldValue = (normalizedRow, target, fallback = '') => {
  const aliases = caseFieldAliasIndex[target] || [normalizeKey(target)];
  return pickValue(normalizedRow, aliases, fallback);
};

const mapCanonicalFields = (rawRow) => {
  // NEW: Use the new direct mapping approach
  return mapFieldsFromRow(rawRow);
};

const backfillFormFields = (caseItem) => {
  if (!caseItem || !caseItem.raw) {
    // No raw data available for backfill
    return caseItem;
  }
  
  // Backfilling missing fields from raw data
  
  const canonicalFields = mapCanonicalFields(caseItem.raw);
  
  // Always regenerate formFields from raw data to ensure consistency
  const mergedFields = { ...canonicalFields };
  
  // Preserve any existing formFields that aren't empty
  if (caseItem.formFields) {
    Object.entries(caseItem.formFields).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && !mergedFields[key]) {
        mergedFields[key] = value;
      }
    });
  }
  
  // Backfill complete
  
  return { ...caseItem, formFields: mergedFields };
};

const backfillCaseCollection = (collection = []) => {
  let mutated = false;
  const next = collection.map((entry) => {
    const updated = backfillFormFields(entry);
    if (updated !== entry) mutated = true;
    return updated;
  });
  return mutated ? next : collection;
};

const buildCaseRecord = (normalizedRow, datasetKey, datasetName, index) => {
  const canonicalFields = mapCanonicalFields(normalizedRow);
  const caseNumber = canonicalFields.case_id
    || resolveCaseFieldValue(normalizedRow, 'caseNumber', `AUTO-${datasetKey}-${index + 1}`)
    || `AUTO-${datasetKey}-${index + 1}`;
  const submissionDate = resolveCaseFieldValue(normalizedRow, 'submissionDate', '')
    || canonicalFields.today
    || normalizedRow.submissiontime
    || '';
  
  // Calculate category from referral fields
  let category = '';
  const categoryFields = [
    { field: 'eng_followup1', optionsKey: 'sj0rz77' },
    { field: 'law_followup3', optionsKey: 'sj0lw91' },
    { field: 'law_followup4', optionsKey: 'sj0lw92' },
    { field: 'law_followup5', optionsKey: 'sj0lw93' },
  ];
  
  for (const { field } of categoryFields) {
    const value = canonicalFields[field];
    if (value && value !== '') {
      category = value;
      break;
    }
  }
  
  return {
    key: `${datasetKey}-${index + 1}-${Math.random().toString(16).slice(2, 6)}`,
    datasetKey,
    datasetName,
    // Status and assignedStaff should use system defaults, NOT survey metadata
    status: 'Pending',
    caseNumber,
    assignedStaff: 'Unassigned',
    followUpDate: resolveCaseFieldValue(normalizedRow, 'followUpDate', ''),
    notes: resolveCaseFieldValue(normalizedRow, 'notes', ''),
    category,
    submissionDate,
    raw: normalizedRow,
    formFields: canonicalFields,
  };
};

export const CasesProvider = ({ children }) => {
  const { users } = useAuth();
  const [cases, setCases] = useState(initialCases);
  const [datasets, setDatasets] = useState(initialDatasets);

  // Create staffDirectory from users
  const staffDirectory = useMemo(() => 
    users.map(user => ({
      id: user.username,
      name: user.name
    }))
  , [users]);

  useEffect(() => {
    setCases((prev) => backfillCaseCollection(prev));
    setDatasets((prev) => prev.map((dataset) => {
      if (!dataset.rows) return dataset;
      const nextRows = backfillCaseCollection(dataset.rows);
      return nextRows !== dataset.rows ? { ...dataset, rows: nextRows } : dataset;
    }));
  }, []);

  const importDataset = useCallback((file) => new Promise((resolve, reject) => {
    // Validate file before processing
    try {
      validateXlsxFile(file);
    } catch (err) {
      message.error(`File validation failed: ${err.message}`);
      reject(err);
      return;
    }
    
    const existingCaseNumbers = new Set((cases || []).map((entry) => normalizeCaseNumberValue(entry.caseNumber)).filter(Boolean));
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const array = new Uint8Array(event.target.result);
        const workbook = XLSX.read(array, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) {
          message.warning('Unable to read sheet in file');
          resolve();
          return;
        }
        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const nonEmptyRows = matrix.filter((row) => row.some((cell) => cell !== '' && cell !== null));
        if (nonEmptyRows.length <= 1) {
          message.warning('Uploaded file does not contain data rows.');
          resolve();
          return;
        }
        const headerRowIndex = detectHeaderRowIndex(nonEmptyRows);
        const headerRow = nonEmptyRows[headerRowIndex];
        const dataRows = nonEmptyRows.slice(headerRowIndex + 1);
        if (!headerRow || !dataRows.length) {
          message.warning('Unable to detect a valid header row in the uploaded file.');
          resolve();
          return;
        }
        const headers = headerRow.map((cell, idx) => {
          const rawCell = typeof cell === 'string' ? cell : (cell ?? '').toString();
          const rosterCanonical = remapRosterHeader(rawCell);
          if (rosterCanonical) return rosterCanonical;
          const baseValue = stripHtml(rawCell);
          const normalized = normalizeKey(baseValue);
          const canonicalFromAlias = aliasToCanonicalIndex[normalized];
          
          // Debug ALL header mappings
          // Header mapping: ${rawCell.substring(0,30)}
          
          if (canonicalFromAlias) return canonicalFromAlias;
          return normalized || `column${idx}`;
        });
        const rawObjects = dataRows.map((row) => {
          const obj = {};
          headers.forEach((headerKey, idx) => {
            const value = row[idx];
            if (value === undefined || value === null) return;
            obj[headerKey] = typeof value === 'string' ? value.toString().trim() : value;
            
            // Debug name and title specifically
            if (idx === 16 || idx === 17) {
              // Row data mapped to key
            }
          });
          return normalizeRowObject(obj);
        }).filter((obj) => Object.values(obj).some((value) => value !== ''));

        if (!rawObjects.length) {
          message.warning('Uploaded file appears to be empty after header row.');
          resolve();
          return;
        }

        const datasetKey = `${Date.now()}`;
        const normalizedRows = rawObjects.map((row, index) => buildCaseRecord(row, datasetKey, file.name, index));

        const dedupedRows = [];
        let skippedDuplicates = 0;
        normalizedRows.forEach((row) => {
          const normalizedCaseNumber = normalizeCaseNumberValue(row.caseNumber || row.formFields?.case_id || '');
          if (normalizedCaseNumber && existingCaseNumbers.has(normalizedCaseNumber)) {
            skippedDuplicates += 1;
            return;
          }
          if (normalizedCaseNumber) existingCaseNumbers.add(normalizedCaseNumber);
          dedupedRows.push(row);
        });

        if (!dedupedRows.length) {
          message.info('All rows in this file already exist in the system. Nothing to import.');
          resolve();
          return;
        }

        setCases((prev) => [...dedupedRows, ...prev]);
        const datasetRecord = {
          key: datasetKey,
          recordId: `UPL-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
          fileName: file.name,
          entries: dedupedRows.length,
          uploadedBy: 'You',
          uploadedOn: new Date().toLocaleDateString(),
          status: 'Validated',
          rows: dedupedRows,
        };
        setDatasets((prev) => [datasetRecord, ...prev]);
        const summarySuffix = skippedDuplicates
          ? `${dedupedRows.length} new, ${skippedDuplicates} skipped as duplicates.`
          : `${dedupedRows.length} rows.`;
        message.success(`${file.name} imported (${summarySuffix})`);
        resolve(dedupedRows);
      } catch (error) {
        console.error('Import failed', error);
        message.error('Could not parse XLSX file');
        reject(error);
      }
    };
    reader.onerror = (err) => {
      message.error('Failed to read file');
      reject(err);
    };
    reader.readAsArrayBuffer(file);
  }), [cases]);

  const deleteDatasets = useCallback((keysToDelete) => {
    if (!keysToDelete.length) return;
    setDatasets((prev) => prev.filter((entry) => !keysToDelete.includes(entry.key)));
    setCases((prev) => prev.filter((row) => !keysToDelete.includes(row.datasetKey)));
  }, []);

  const deleteCases = useCallback((caseKeys) => {
    if (!caseKeys.length) return;
    setCases((prev) => prev.filter((row) => !caseKeys.includes(row.key)));
    setDatasets((prev) => prev.map((dataset) => {
      const filteredRows = (dataset.rows || []).filter((row) => !caseKeys.includes(row.key));
      return { ...dataset, rows: filteredRows, entries: filteredRows.length };
    }));
  }, []);

  const mergeCaseUpdates = useCallback((caseItem, updates = {}) => {
    if (!updates || !Object.keys(updates).length) return caseItem;
    const next = { ...caseItem, ...updates };
    if (caseItem.formFields) {
      next.formFields = { ...caseItem.formFields };
      if (updates.assignedStaff !== undefined) {
        next.formFields.staff_name = updates.assignedStaff;
      }
      if (updates.status !== undefined) {
        next.formFields.survey_off_diss = updates.status;
      }
    }
    return next;
  }, []);

  const updateCase = useCallback((caseKey, updates) => {
    setCases((prev) => prev.map((entry) => (entry.key === caseKey ? mergeCaseUpdates(entry, updates) : entry)));
    setDatasets((prev) => prev.map((dataset) => {
      if (!dataset.rows) return dataset;
      const updatedRows = dataset.rows.map((row) => (row.key === caseKey ? mergeCaseUpdates(row, updates) : row));
      const isChanged = updatedRows.some((row, idx) => row !== dataset.rows[idx]);
      return isChanged ? { ...dataset, rows: updatedRows } : dataset;
    }));
  }, [mergeCaseUpdates]);

  const value = useMemo(() => ({
    cases,
    datasets,
    staffDirectory,
    importDataset,
    deleteDatasets,
    deleteCases,
    updateCase,
  }), [cases, datasets, importDataset, deleteDatasets, deleteCases, updateCase]);

  return (
    <CasesContext.Provider value={value}>
      {children}
    </CasesContext.Provider>
  );
};

export const useCases = () => {
  const ctx = useContext(CasesContext);
  if (!ctx) throw new Error('useCases must be used within CasesProvider');
  return ctx;
};
