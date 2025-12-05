/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import * as XLSX from 'xlsx';
import { fetchCases as apiFetchCases, importXLSX as apiImportXLSX, createCase as apiCreateCase, deleteCaseApi as apiDeleteCase } from '../api';
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

  // Also map case-level canonical fields from caseFieldAliasIndex (caseNumber, status, assignedStaff, followUpDate, notes, submissionDate)
  Object.entries(caseFieldAliasIndex).forEach(([caseKey, aliases]) => {
    for (const alias of aliases) {
      const clean = normalizeKey(alias);
      if (rowLookup[clean] !== undefined && rowLookup[clean] !== '') {
        // Only set if not already set by field-level mapping (forms)
        if (result[caseKey] === undefined || result[caseKey] === '') {
          result[caseKey] = rowLookup[clean];
        }
        break;
      }
    }
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

// NOTE: resolveFieldValue was removed - instead, using mapFieldsFromRow & direct alias lookup via
// `caseFieldAliasIndex` / `fieldAliasIndex`. Keep the implementation here archived if needed.

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

const buildCaseRecord = (normalizedRow, datasetKey, datasetName, index, defaultAssigned = 'Unassigned', defaultStatus = 'Pending') => {
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
  
  // defaultAssigned (typically currentUser.name) should be used unless case has server-assigned user
  const computedStatus = defaultStatus;
  // If case has an actual server-assigned user, prefer it; otherwise use the default assigned value passed by the caller
  const computedAssigned = defaultAssigned || canonicalFields.assignedStaff || canonicalFields.staff_name || 'Unassigned';

  return {
    key: `${datasetKey}-${index + 1}-${Math.random().toString(16).slice(2, 6)}`,
    datasetKey,
    datasetName,
    // Status and assignedStaff should use system defaults, NOT survey metadata
    status: computedStatus || 'Pending',
    caseNumber,
    assignedStaff: computedAssigned || 'Unassigned',
    followUpDate: resolveCaseFieldValue(normalizedRow, 'followUpDate', ''),
    notes: resolveCaseFieldValue(normalizedRow, 'notes', ''),
    category,
    submissionDate,
    raw: normalizedRow,
    formFields: canonicalFields,
  };
};

export const CasesProvider = ({ children }) => {
  const { users, currentUser } = useAuth();
  const [cases, setCases] = useState(() => backfillCaseCollection(initialCases));
  const [datasets, setDatasets] = useState(() => initialDatasets.map((dataset) => ({
    ...dataset,
    rows: backfillCaseCollection(dataset.rows || []),
  })));

  // Create staffDirectory from users
  const staffDirectory = useMemo(() => 
    users.map(user => ({
      id: user.username,
      name: user.name
    }))
  , [users]);

  // no first-run setState needed; initial state already backfilled

  const loadCasesFromBackend = useCallback(async () => {
    try {
      const serverCases = await apiFetchCases();
      if (!Array.isArray(serverCases)) return;
      const mapped = serverCases.map((c) => ({
        key: `server-${c.id}`,
        datasetKey: `server`,
        datasetName: 'Backend',
        status: c.status || 'Pending',
        caseNumber: (c.raw?.case_id || c.title || (c.id ? `C-${c.id}` : '')),
        assignedStaff: c.assigned_to?.name || 'Unassigned',
        followUpDate: c.raw?.today || c.raw?.last_visit_date || c.created_at || '',
        notes: c.description || c.raw?.extra_note || '',
        title: c.title || c.raw?.beneficiary_name || '',
        id: c.id,
        raw: c.raw || c,
      }));
      setCases(backfillCaseCollection(mapped));
    } catch (err) {
      console.warn('Failed to load cases from backend', err);
    }
  }, []);

  React.useEffect(() => {
    // On mount, load cases from backend so data persists across refreshes
    loadCasesFromBackend();
  }, [loadCasesFromBackend]);

  const reloadCases = useCallback(async () => {
    try {
      await loadCasesFromBackend();
    } catch (err) {
      console.warn('reloadCases failed', err);
    }
  }, [loadCasesFromBackend]);

  const importDataset = useCallback((file) => new Promise(async (resolve, reject) => {
    // If the backend supports import, use it and reload cases
    try {
      if (file && apiImportXLSX) {
        await apiImportXLSX(file);
        await loadCasesFromBackend();
        message.success(`${file.name || 'File'} imported to server and refreshed.`);
        resolve([]);
        return;
      }
    } catch (err) {
      console.warn('Backend import failed, falling back to client-side import', err);
      // Show user-friendly error based on status
      if (err && err.status === 401) {
        message.error('Server import failed: please login or refresh your session.');
      } else if (err && err.status === 403) {
        message.error('Server import failed: permission denied (admin required).');
      } else if (err && err.body && err.body.detail) {
        message.error(`Server import failed: ${err.body.detail}`);
      } else {
        message.error('Server import failed; fallback to local import. Check network/auth.');
      }
      // fall-through to client-side import if backend import fails
    }
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
    reader.onload = async (event) => {
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
        const normalizedRows = rawObjects.map((row, index) => buildCaseRecord(row, datasetKey, file.name, index, 'Unassigned', 'Pending'));

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
        // If backend import failed, try to create records on the server (if allowed/authenticated)
        try {
          // Attempt to create server-side records for deduped rows. If the call fails due to missing auth, fall back to client-only import
          const created = [];
          for (const row of dedupedRows) {
            try {
              const payload = {
                title: row.title || row.formFields?.beneficiary_name || row.caseNumber || 'Case',
                description: row.notes || row.formFields?.extra_note || row.raw?.description || '',
                // Enforce system default status for newly created cases
                status: 'Pending',
                raw: row.raw || row,
              };
                    // Do not set assigned_to_id from XLSX staff values; default to Unassigned unless assignment is explicit
              const srv = await apiCreateCase(payload);
              if (srv && srv.id) created.push(srv);
            } catch (e) {
              console.warn('Failed to create case on server for row, falling back to local import', e);
              // If a single row creation fails due to auth, break and fall back to local import for all
              throw e;
            }
          }
          if (created.length) {
            // If we created records, reload from server so mapping uses `raw` persisted
            await loadCasesFromBackend();
            message.success(`${created.length} rows created on server and refreshed`);
            resolve(created);
            return;
          }
        } catch (err) {
          console.warn('Server create fallback failed or not authenticated; using in-memory import', err);
        }

        // Fallback to in-memory import only for local development or unauthenticated sessions
        setCases((prev) => [...dedupedRows, ...prev]);
        if (!currentUser) {
          message.info('Imported to local workspace only. Sign in to persist to the server.');
        } else {
          message.info('Imported locally (server persistence failed); check network/auth).');
        }
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
  }), [cases, users, currentUser, loadCasesFromBackend]);

  const deleteDatasets = useCallback((keysToDelete) => {
    if (!keysToDelete.length) return;
    setDatasets((prev) => prev.filter((entry) => !keysToDelete.includes(entry.key)));
    setCases((prev) => prev.filter((row) => !keysToDelete.includes(row.datasetKey)));
  }, []);

  const deleteCases = useCallback(async (caseKeys) => {
    if (!caseKeys.length) return;
    const serverIds = [];
    // Optimistic update for local UI
    setCases((prev) => prev.filter((row) => {
      if (!caseKeys.includes(row.key)) return true;
      if (row.id) serverIds.push(row.id);
      return false;
    }));
    setDatasets((prev) => prev.map((dataset) => {
      if (!dataset.rows) return dataset;
      const filteredRows = (dataset.rows || []).filter((row) => !caseKeys.includes(row.key));
      return { ...dataset, rows: filteredRows, entries: filteredRows.length };
    }));

    // Delete server-backed cases (best-effort)
    await Promise.all(serverIds.map(async (id) => {
      try {
        await apiDeleteCase(id);
      } catch (err) {
        console.warn('Failed to delete server case', id, err);
      }
    }));
    // Refresh server state after deletion attempts
    await loadCasesFromBackend();
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
    reloadCases,
  }), [cases, datasets, importDataset, deleteDatasets, deleteCases, updateCase, staffDirectory]);

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
