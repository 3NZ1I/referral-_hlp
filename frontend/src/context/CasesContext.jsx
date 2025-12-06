/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react';
import * as XLSX from 'xlsx';
import { fetchCases as apiFetchCases, importXLSX as apiImportXLSX, createCase as apiCreateCase, deleteCaseApi as apiDeleteCase } from '../api';
import { message } from 'antd';
import { formSections, caseFieldMapping, selectOptions } from '../data/formMetadata';
import { useAuth } from './AuthContext';
import { validateXlsxFile } from '../utils/xlsxGuard';

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

const collectLabelAliases = (label = {}) => ['en', 'ar']
  .map((locale) => {
    const raw = label[locale];
    if (!raw || typeof raw !== 'string') return '';
    return stripHtml(raw).trim();
  })
  .filter(Boolean);

const rosterLabelSuffixIndex = (() => {
  const entries = [
    ['صلة القرابة', '_partner_relation1'],
    ['kinship ties', '_partner_relation1'],
    ['relation', '_partner_relation1'],
    ['relationship', '_partner_relation1'],
    ['مسجل في الأحوال المدنية', '_partner_govreg'],
    ['registered in civil registry', '_partner_govreg'],
    ['registered in civil', '_partner_govreg'],
    ['registered', '_partner_govreg'],
    ['reg', '_partner_govreg'],
    ['civil registry', '_partner_govreg'],
    ['الاسم', '_partner_name'],
    ['الأسم', '_partner_name'],
    ['name', '_partner_name'],
    ['first name', '_partner_name'],
    ['firstname', '_partner_name'],
    ['given name', '_partner_name'],
    ['given_name', '_partner_name'],
    ['اللقب', '_partner_lastname'],
    ['last name', '_partner_lastname'],
    ['title', '_partner_lastname'],
    ['family name', '_partner_lastname'],
    ['family_name', '_partner_lastname'],
    ['surname', '_partner_lastname'],
    ['تاريخ الميلاد', '_partner'],
    ['date of birth', '_partner'],
    ['dob', '_partner'],
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
  const norm = normalizeKey(stripped);
  // If header already includes the canonical group prefix, normalize and return
  const existingMatch = norm.match(/group_fj2tt69_partnernu1_(\d+(?:_\d+)*)_([a-z0-9_]+)/i);
  if (existingMatch) {
    return `group_fj2tt69_partnernu1_${existingMatch[1]}_${existingMatch[2]}`;
  }
  // Find slot pattern anywhere in the header (accept '7_1', '7-1', '7.1' or '01' or '1')
  let slot = null;
  const slotMatch = norm.match(/(\d+(?:[._-]\d+)*)/);
  if (slotMatch) {
    slot = slotMatch[1].replace(/[._-]/g, '_').replace(/^0+/, '');
  }
  // find label part by checking known roster label suffix index entries included in the header
  let foundSuffix = null;
  Object.keys(rosterLabelSuffixIndex).forEach((label) => {
    if (norm.includes(normalizeKey(label)) && !foundSuffix) {
      foundSuffix = rosterLabelSuffixIndex[normalizeKey(label)];
    }
  });
  // Additional heuristic fallback: pick 'govreg' if header contains 'regist' or 'civil'
  if (!foundSuffix && /\b(regist|civil reg|civil|reg)\b/.test(norm)) {
    foundSuffix = rosterLabelSuffixIndex[normalizeKey('registered')];
  }
  if (!foundSuffix || !slot) return null;
  return `group_fj2tt69_partnernu1_${slot}${foundSuffix}`;
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
  
  // If raw has a direct family roster array (e.g., raw.family) and we didn't map it yet, ensure it populates formFields.family
  try {
    // If raw already includes canonical family array, use it
    if ((!mergedFields || Object.keys(mergedFields).length === 0) && caseItem.raw && (caseItem.raw.family || caseItem.raw.formFields && caseItem.raw.formFields.family)) {
      // Normalize existing family arrays from raw or raw.formFields.family
      const rawFamily = caseItem.raw.formFields && caseItem.raw.formFields.family ? caseItem.raw.formFields.family : caseItem.raw.family;
      if (Array.isArray(rawFamily)) {
        mergedFields.family = rawFamily.map((m) => normalizeFamilyMember(m)).filter(Boolean);
      } else {
        mergedFields.family = rawFamily;
      }
    }
    // If formFields.family not present, try to parse grouped fields for the family roster
    if ((!mergedFields.family || !Array.isArray(mergedFields.family) || mergedFields.family.length === 0) && caseItem.raw) {
      // Make a best-effort attempt to remap non-canonical headers in raw into canonical group keys.
      // This helps when header normalization missed them (e.g., 'First name 1' left un-mapped).
      try {
        Object.keys(caseItem.raw || {}).forEach((k) => {
          try {
            const maybeCanonical = remapRosterHeader(String(k));
            if (maybeCanonical && !Object.prototype.hasOwnProperty.call(caseItem.raw, maybeCanonical)) {
              // Preserve original; only set if canonical missing
              caseItem.raw[maybeCanonical] = caseItem.raw[k];
            }
          } catch (e) {
            // ignore malformed keys
          }
        });
      } catch (remapErr) {
        // ignore remap errors; proceed with original raw
      }
      // collect keys that match the grouped roster pattern 'group_fj2tt69_partnernu1_<slot>_...'
      const rawKeys = Object.keys(caseItem.raw || {});
      const rosterPattern = /^group_fj2tt69_partnernu1_(\d+(?:_\d+)*)_(.+)$/; // capture slot and suffix
      const groups = {};
      rawKeys.forEach((k) => {
        // Normalize key for matching: lowercase, strip HTML, and replace non-alphanum/underscore with underscore
        const normalizedKey = normalizeKey(k).replace(/[^a-z0-9_]/g, '_');
        const m = normalizedKey.match(rosterPattern);
        if (!m) return;
        let slot = m[1].replace(/_+/g, '_');
        let suffix = m[2].replace(/^_+/, '').replace(/_+/g, '_');
        if (!groups[slot]) groups[slot] = {};
        // Keep original value from the raw object (not the normalized key)
        groups[slot][suffix] = caseItem.raw[k];
      });
      // Convert groups to roster entries using a mapping from suffix -> field name
  // Reusable mapping function to convert group suffixes into our member fields
  const mapSuffixToField = (suffix) => {
    if (!suffix || typeof suffix !== 'string') return suffix;
    const s = suffix.toLowerCase();
    if (s.includes('relation')) return 'relation';
    if (s.includes('govreg') || /reg(istr|istration|istr|)/.test(s)) return 'govreg';
    if (s.includes('last') || s.includes('lastname') || s.includes('family_name') || s.includes('title')) return 'lastName';
    if ((s.includes('first') && s.includes('name')) || (s.match(/\bname\b/) && s.includes('first'))) return 'name';
    if (s.includes('name')) return 'name';
    if (s === 'partner' || s.includes('birth') || s.includes('date') || s.includes('dob')) return 'birthDate';
    if (s.includes('national') || s.includes('country')) return 'nationality';
    if (s.includes('note')) return 'note';
    return suffix.replace(/^_+/, '');
  };
      // Ensure roster order matches Kobo form ordering and local display expectations.
      // For local file imports, preserve the header order (appearance order in file)
      let slotsToUse;
      try {
        if (caseItem && caseItem.source === 'file') {
          // Keep insertion order of groups (which matches header order for local imports)
          slotsToUse = Object.keys(groups);
        } else {
          // Default order used for server/kobo cases — keeps expected form ordering
          const desiredSlotOrder = ['7_1', '5_1', '3_1', '2_1', '1', '6_1', '4_1'];
          const restSlots = Object.keys(groups).filter((s) => !desiredSlotOrder.includes(s)).sort();
          slotsToUse = [...desiredSlotOrder, ...restSlots].filter((s) => groups[s]);
        }
      } catch (err) {
        // Fallback to numeric sort if something goes wrong
        slotsToUse = Object.keys(groups).sort((a, b) => {
          const toNum = (s) => Number(s.split('_')[0] || s);
          return toNum(a) - toNum(b);
        });
      }
      const rosterArr = slotsToUse.map((slot) => {
        const g = groups[slot];
        const obj = {};
        Object.entries(g).forEach(([suffix, val]) => {
          const mapped = mapSuffixToField(suffix) || suffix;
          if (val !== undefined && val !== null && val !== '') obj[mapped] = val;
        });
        // retain the slot for later rendering (slot name like '7_1')
        obj.slot = slot;
        return Object.keys(obj).length ? normalizeFamilyMember(obj) : null;
      }).filter(Boolean);
      if (rosterArr.length) {
        mergedFields.family = rosterArr;
        // also set raw.family so other parts that rely on raw.family can use it
        try {
          caseItem.raw.formFields = caseItem.raw.formFields || {};
          caseItem.raw.formFields.family = rosterArr;
          // also set top-level raw.family for convenience and backward compatibility
          caseItem.raw.family = rosterArr;
        } catch (e) {
          // ignore errors setting nested object
        }
      }
      // Helpful debug in development mode to inspect roster parsing
      try {
        if (process && process.env && process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug('backfillFormFields: parsed roster slots', Object.keys(groups), '->', rosterArr.length, rosterArr);
        }
      } catch (e) {
        // ignore -- do not break production behavior
      }
    }
  } catch (e) {
    // ignore any errors
  }

  return { ...caseItem, formFields: mergedFields };
};

// Normalize family member objects across different source representations
const normalizeFamilyMember = (m) => {
  if (!m || typeof m !== 'object') return null;
  const src = m || {};
  const getAny = (keys) => {
    for (const k of keys) {
      if (src[k] !== undefined && src[k] !== null && src[k] !== '') return src[k];
    }
    return '';
  };
  // If the member object contains canonical group keys, extract by suffix first
  const obj = {};
  Object.entries(src).forEach(([key, val]) => {
    if (!key) return;
    const canonicalMatch = key.toString().match(/group_fj2tt69_partnernu1_(\d+(?:_\d+)*)_(.+)$/i);
    if (canonicalMatch) {
      const suffix = canonicalMatch[2];
      const mapped = mapSuffixToField(suffix);
      if (mapped && val !== undefined && val !== null && val !== '') {
        obj[mapped] = val;
      }
    }
  });
  const name = obj.name || getAny(['name', 'first_name', 'firstname', 'partner_name', 'beneficiary_name', 'given_name', 'givenname']);
  const lastName = getAny(['lastName', 'lastname', 'last_name', 'family_name', 'partner_lastname', 'partner_last_name', 'surname']);
  const relation = getAny(['relation', 'relation1', 'partner_relation1', 'relationship']);
  const birthDate = getAny(['birthDate', 'partner', 'birthday', 'date_of_birth', 'dob']);
  const nationality = getAny(['nationality', 'partner_nationality', 'country']);
  const govreg = getAny(['govreg', 'partner_govreg', 'registered', 'registered_in_civil', 'registered_in_civil_registry']);
  const slot = getAny(['slot', 'slotLabel', 'slot_number', 'id']);
  const note = getAny(['note', 'partner_note']);
  if (name) obj.name = name;
  if (lastName) obj.lastName = lastName;
  if (relation) obj.relation = relation;
  if (birthDate) obj.birthDate = birthDate;
  if (nationality) obj.nationality = nationality;
  if (govreg) obj.govreg = govreg;
  if (slot) obj.slot = slot;
  if (note) obj.note = note;
  return Object.keys(obj).length ? obj : null;
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
  
  // Calculate category from referral fields; prefer canonicalFields then raw fallback
  let category = '';
  // Category priority: External legal guidance, External legal referral,
  // Internal legal referral, Type of legal case, then Engineering referral type.
  const categoryFields = [
    { field: 'law_followup5', optionsKey: 'sj0lw93' }, // External legal guidance
    { field: 'law_followup4', optionsKey: 'sj0lw92' }, // External legal referral
    { field: 'law_followup3', optionsKey: 'sj0lw91' }, // Internal legal referral
    { field: 'law_followup1', optionsKey: 'sj0rz88' }, // Type of legal case
    { field: 'eng_followup1', optionsKey: 'sj0rz77' }, // Engineering referral type
  ];
  
  for (const { field } of categoryFields) {
    // Prefer canonical mapping first
    let value = canonicalFields[field];
    // Fallback to a raw field alias if canonical mapping is not available
    if ((value === undefined || value === '') && normalizedRow && normalizedRow[field]) {
      value = normalizedRow[field];
    }
    if (value && value !== '') {
      // Map option value to human-friendly label using selectOptions if possible
      try {
        const optionKey = (() => {
          // find field definition by name in formSections
          for (const s of formSections) {
            for (const f of s.fields || []) {
              if (f.name === field) return f.optionsKey || null;
            }
          }
          return null;
        })();
        if (optionKey && selectOptions && selectOptions[optionKey]) {
          const opt = (selectOptions[optionKey] || []).find((o) => o.value === value);
          if (opt) category = `${opt.label?.en || value}${opt.label?.ar ? ` / ${opt.label.ar}` : ''}`;
          else category = value;
        } else {
          category = value;
        }
      } catch (e) {
        category = value;
      }
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
    // Prefer submission timestamp when available to compute age consistently
    created_at: normalizedRow._submission_time || normalizedRow.submissiontime || normalizedRow.created_at || undefined,
    updated_at: normalizedRow.updated_at || normalizedRow._last_edited || normalizedRow._updated || normalizedRow._submission_time || undefined,
    raw: normalizedRow,
    formFields: canonicalFields,
    // Source: 'file' for local XLSX uploads; 'server' for backend cases; set datasetKey so callers can detect
    source: (datasetKey === 'server' ? 'server' : 'file'),
    // roster family data is kept under `formFields.family` for rendering in details; do not expose a family size in the case list
  };
};

export const CasesProvider = ({ children }) => {
  const { users, currentUser } = useAuth();
  const [cases, setCases] = useState(() => backfillCaseCollection(initialCases));
  const [datasets, setDatasets] = useState(() => initialDatasets.map((dataset) => ({
    ...dataset,
    rows: backfillCaseCollection(dataset.rows || []),
  })));

  // Preferred value language persisted to localStorage. Default to Arabic 'ar'.
  const [valueLang, setValueLang] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const v = window.localStorage.getItem('preferredValueLanguage');
        return v || 'ar';
      }
    } catch (e) {
      // ignore
    }
    return 'ar';
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('preferredValueLanguage', valueLang);
      }
    } catch (e) {
      // ignore persistence errors
    }
  }, [valueLang]);

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
        source: (c.raw && (c.raw.kobo_case_id || c.raw.kobo_caseNumber || c.raw.kobo__id)) ? 'kobo' : 'server',
        raw: c.raw || c,
        created_at: c.created_at || (c.raw && (c.raw._submission_time || c.raw.submissiontime)) || undefined,
        updated_at: c.updated_at || (c.raw && (c.raw._last_edited || c.raw._updated)) || undefined,
        completed_at: c.completed_at || undefined,
        uploadedBy: c.raw?.uploaded_by || c.raw?.uploadedBy || null,
        assignedToId: (c.assigned_to && c.assigned_to.id) || null,
        assignedStaffNormalized: ((c.assigned_to && c.assigned_to.name) || c.assignedStaff || '').toLowerCase(),
      }));
      // After mapping, backfill category from raw/formFields if present
      mapped.forEach((m) => {
        try {
          const canonicalFields = mapCanonicalFields(m.raw || {});
          const categoryFields = ['law_followup5', 'law_followup4', 'law_followup3', 'law_followup1', 'eng_followup1'];
          let category = '';
          let categoryFieldName = null;
          for (const f of categoryFields) {
            const val = canonicalFields[f];
            if (val && val !== '') { category = val; categoryFieldName = f; break; }
          }
          if (category) {
            // Try to map option values to labels like in buildCaseRecord
            try {
              const optionKey = (() => {
                for (const s of formSections) {
                  for (const fd of s.fields || []) {
                    if (fd.name === categoryFieldName) return fd.optionsKey || null;
                  }
                }
                return null;
              })();
              if (optionKey && selectOptions && selectOptions[optionKey]) {
                const opt = (selectOptions[optionKey] || []).find((o) => o.value === category);
                if (opt) m.category = `${opt.label?.en || category}${opt.label?.ar ? ` / ${opt.label.ar}` : ''}`;
                else m.category = category;
              } else {
                m.category = category;
              }
            } catch (e) {
              m.category = category;
            }
          }
        } catch (err) {
          // don't crash on backfill
          console.warn('Backfill category error', m.id, err);
        }
      });
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
    let importResult = null;
    let perRowFailedRows = [];
    // Validate file before processing
    try {
      validateXlsxFile(file);
    } catch (err) {
      message.error(`File validation failed: ${err.message}`);
      reject(err);
      return;
    }
    
    const existingCaseNumbers = new Set((cases || []).map((entry) => normalizeCaseNumberValue(entry.caseNumber)).filter(Boolean));
    const existingRawIds = new Set((cases || []).map((entry) => {
      const raw = entry.raw || {};
      return (raw._id || raw._uuid || raw.case_id || raw.caseNumber || raw._submission_time || raw.submissiontime);
    }).filter(Boolean));
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const resultData = event?.target?.result;
        if (!resultData) {
          const errMsg = 'File read returned empty content; cannot parse XLSX';
          console.error(errMsg, event);
          message.error(errMsg);
          reject(new Error(errMsg));
          return;
        }
        const array = new Uint8Array(resultData);
        try {
          console.debug('Import file info', { name: file.name, size: file.size, type: file.type });
        } catch (infoErr) {
          // ignore
        }
        let workbook;
        try {
          workbook = XLSX.read(array, { type: 'array' });
        } catch (err) {
          console.warn('Primary XLSX.parse(array) failed; attempting fallbacks', err);
          try {
            // Try utf-8 text decoding into a binary string
            const binary = typeof TextDecoder !== 'undefined'
              ? new TextDecoder('utf-8').decode(array)
              : String.fromCharCode.apply(null, Array.from(array));
            workbook = XLSX.read(binary, { type: 'binary' });
          } catch (err2) {
            console.warn('Text decoding fallback failed', err2);
            try {
              // As a last resort, try building a binary string via char codes
              let binary2 = '';
              for (let i = 0; i < array.length; i += 1) {
                binary2 += String.fromCharCode(array[i]);
                if (i > 16384) break; // don't build huge strings for safety
              }
              workbook = XLSX.read(binary2, { type: 'binary' });
                } catch (err3) {
                  console.error('All XLSX parsing fallbacks failed', err, err2, err3);
                  // attempt to detect signature
                  try {
                    const signature = String.fromCharCode(array[0], array[1], array[2], array[3]);
                    console.warn('File signature (first 4 chars):', signature);
                  } catch (sigErr) {
                    console.warn('Signature detection failed', sigErr);
                  }
                  throw err; // propagate original error to outer catch
                }
          }
        }
        // Choose the best sheet in the workbook: prefer 'cases' sheet or sheet with case headers/rosters
        const scoreSheet = (() => {
          const candidates = workbook?.SheetNames || [];
          let best = { name: null, score: -Infinity };
          candidates.forEach((name) => {
            try {
              const s = workbook.Sheets[name];
              const rows = XLSX.utils.sheet_to_json(s, { header: 1, defval: '' });
              const nonEmptyRows = rows.filter((r) => r && r.some((c) => c !== '' && c !== null));
              if (!nonEmptyRows.length) return;
              const headerIdx = detectHeaderRowIndex(nonEmptyRows);
              const headerRow = nonEmptyRows[headerIdx] || nonEmptyRows[0] || [];
              let caseAliasHits = 0;
              let rosterHits = 0;
              headerRow.forEach((cell) => {
                const raw = typeof cell === 'string' ? cell : (cell ?? '').toString();
                const rosterCanonical = remapRosterHeader(raw);
                if (rosterCanonical) rosterHits += 1;
                const normalized = normalizeKey(stripHtml(raw));
                if (aliasToCanonicalIndex[normalized]) {
                  // If this canonical is a case field or known field, count it
                  const canonical = aliasToCanonicalIndex[normalized];
                  const caseFieldLike = ['case_id', 'caseNumber', 'beneficiary_name', 'beneficiary_last_name'].includes(canonical);
                  if (caseFieldLike) caseAliasHits += 1;
                }
              });
              let score = (caseAliasHits * 2) + (rosterHits * 5);
              const lowerName = (name || '').toLowerCase();
              if (lowerName.includes('case') || lowerName.includes('cases') || lowerName.includes('dataset') || lowerName.includes('data')) score += 10;
              if (score > best.score) best = { name, score };
            } catch (e) {
              // don't fail on sheet read
            }
          });
          return best;
        })();
        const sheetName = scoreSheet.name || (Array.isArray(workbook.SheetNames) && workbook.SheetNames[0]) || null;
        const sheetScore = scoreSheet.score || 0;
        try { console.debug('XLSX: selected sheet for import:', sheetName, 'score:', sheetScore); } catch (e) {}
        if (sheetScore <= 0) {
          // Warn the user that the uploaded workbook doesn't appear to contain Cases data (looks like a survey workbook)
          try { message.warning('Uploaded workbook does not look like a Cases dataset (no case headers or roster columns detected).'); } catch (e) {}
        }
        try { console.debug('XLSX: selected sheet for import:', sheetName); } catch (e) {}
        const sheet = sheetName ? workbook.Sheets[sheetName] : null;
        if (!sheet) {
          throw new Error('No sheet found in XLSX workbook (Workbook sheet names: ' + JSON.stringify(workbook?.SheetNames || []) + ')');
        }
        if (!sheet) {
          message.warning('Unable to read sheet in file');
          resolve();
          return;
        }
        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        console.debug('XLSX parse: matrix size', matrix.length, 'first row preview', matrix[0] && matrix[0].slice ? matrix[0].slice(0, 8) : matrix[0]);
        const nonEmptyRows = matrix.filter((row) => row.some((cell) => cell !== '' && cell !== null));
        console.debug('XLSX parse: nonEmptyRows count', nonEmptyRows.length);
        if (nonEmptyRows.length <= 1) {
          message.warning('Uploaded file does not contain data rows.');
          resolve();
          return;
        }
        const headerRowIndex = detectHeaderRowIndex(nonEmptyRows);
        console.debug('XLSX parse: headerRowIndex:', headerRowIndex, 'header preview:', nonEmptyRows[headerRowIndex]);
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
          
          // Debug header mapping for development
          try {
            if (process && process.env && process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.debug('XLSX header mapping:', { idx, raw: rawCell, normalized, canonicalFromAlias });
            }
          } catch (e) {}
          
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
          const rawId = row.raw && (row.raw._id || row.raw._uuid || row.raw.case_id || row.raw.caseNumber || row.raw._submission_time || row.raw.submissiontime);
          if (normalizedCaseNumber && existingCaseNumbers.has(normalizedCaseNumber)) {
            skippedDuplicates += 1;
            return;
          }
          if (rawId && existingRawIds.has(rawId)) {
            skippedDuplicates += 1;
            return;
          }
          if (normalizedCaseNumber) existingCaseNumbers.add(normalizedCaseNumber);
          if (rawId) existingRawIds.add(rawId);
          dedupedRows.push(row);
        });

        if (!dedupedRows.length) {
          message.info('All rows in this file already exist in the system. Nothing to import.');
          resolve();
          return;
        }
        // Try server import now that we have parsed rows - this gives us a mapping to mark failed rows
        try {
          if (file && apiImportXLSX) {
            importResult = await apiImportXLSX(file);
            const createdCount = (importResult && importResult.created_ids && importResult.created_ids.length) || importResult?.imported || 0;
            const failedCount = (importResult && importResult.failed_rows && importResult.failed_rows.length) || 0;
            if (createdCount) {
              await loadCasesFromBackend();
              if (failedCount) {
                message.warning(`${createdCount} rows created on server; ${failedCount} rows failed to import. They will be available for retry.`);
              } else {
                message.success(`${file.name || 'File'} imported to server and refreshed.`);
                resolve(importResult?.created_ids || []);
                return;
              }
            } else if (failedCount && failedCount > 0 && !createdCount) {
              message.warning(`No rows created on server; ${failedCount} rows failed to import.`);
            } else {
              await loadCasesFromBackend();
              message.success(`${file.name || 'File'} imported to server and refreshed.`);
              resolve(importResult?.created_ids || []);
              return;
            }
          }
        } catch (err) {
          // Log detailed error info for debugging (status, body, stack)
          try {
            console.warn('Server import attempt failed -- error details:', {
              message: err?.message,
              status: err?.status,
              body: err?.body,
              stack: err?.stack,
            });
          } catch (logErr) {
            console.warn('Server import attempt failed; error logged (toString):', String(err));
          }
          // More informative and less alarming messages for the user
          const detail = err && (err.body?.detail || err.body?.message || err.message);
          if (err && (err.status === 401 || err?.message === 'not-authenticated')) {
            message.error('Server import failed: please login or refresh your session.');
          } else if (err && err.status === 403) {
            message.error('Server import failed: permission denied (admin required).');
          } else if (err && err.status === 413) {
            message.error('Server import failed: file too large. Try a smaller file.');
          } else if (detail) {
            message.warning(`Server import returned: ${detail}. Attempting per-row fallback.`);
          } else if (err && typeof err.message === 'string' && err.message.toLowerCase().includes('failed to fetch')) {
            message.error('Failed to reach API: the backend may be down, or CORS is not configured to allow your origin. Check server logs and CORS_ORIGINS settings.');
          } else {
            message.warning('Server import failed (see console for details); attempting per-row create or fallback to local import.');
          }
        }
        // If backend import failed, try to create records on the server (if allowed/authenticated)
        try {
          // Attempt to create server-side records for deduped rows. If the call fails due to missing auth, fall back to client-only import
          // Only attempt server-side per-row creation when the user is authenticated
          if (!currentUser) throw new Error('not-authenticated');
          const created = [];
          perRowFailedRows = [];
          for (const row of dedupedRows) {
            try {
              const sanitizedRaw = (() => {
                try {
                  return JSON.parse(JSON.stringify(row.raw || row));
                } catch (err) {
                  // Fallback to a minimal raw set to avoid JSON non-serializable values
                  return { caseNumber: row.caseNumber || undefined, title: row.title || undefined };
                }
              })();
              const titleVal = (row.title || row.formFields?.beneficiary_name || row.caseNumber || `Case ${row.key}`) + '';
              const payload = {
                title: titleVal.trim() || `Case ${row.key}`,
                description: (row.notes || row.formFields?.extra_note || row.raw?.description || '') + '',
                status: 'Pending',
                raw: sanitizedRaw,
              };
              const srv = await apiCreateCase(payload);
              if (srv && srv.id) created.push(srv);
              else perRowFailedRows.push(row);
            } catch (e) {
              // If unauthorized or forbidden, stop attempting further server creates and fall back to local import
              if (e && (e.status === 401 || e.status === 403)) {
                console.warn('Server create aborted due to auth/permission error', e);
                throw e; // caught by outer catch to fallback entirely
              }
              console.warn('Failed to create case on server for row, skipping and continuing', e);
              perRowFailedRows.push(row);
            }
          }
          if (created.length) {
            // If we created records, reload from server so mapping uses `raw` persisted
            await loadCasesFromBackend();
            if (perRowFailedRows.length) {
              message.warning(`${created.length} rows created on server; ${perRowFailedRows.length} failed and were imported locally.`);
            } else {
              message.success(`${created.length} rows created on server and refreshed`);
              resolve(created);
              return;
            }
          }
        } catch (err) {
          console.warn('Server create fallback failed or not authenticated; using in-memory import', err);
          if ((err && err.status === 401) || err.message === 'not-authenticated') {
            message.error('Server import or create failed: please login again or refresh your session.');
          } else if (err && err.status === 403) {
            message.error('Server import or create failed: permission denied (admin required).');
          }
        }

        // Fallback to in-memory import only for local development or unauthenticated sessions
        // Ensure local fallback rows include a created_at timestamp so Age/SLA calculations work
        const nowIso = new Date().toISOString();
        const dedupedWithTimestamps = dedupedRows.map((r) => ({ ...r, created_at: r.created_at || nowIso }));
        // Backfill formFields.family for local import rows (ensure roster parsing runs for XLSX rows)
        const backfilledLocalRows = backfillCaseCollection(dedupedWithTimestamps);
        setCases((prev) => [...backfilledLocalRows, ...prev]);
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
          uploadedBy: currentUser ? (currentUser.name || currentUser.username) : 'You',
          uploadedOn: new Date().toLocaleDateString(),
          status: 'Validated',
            rows: backfilledLocalRows,
          serverImportSummary: importResult || null,
          failedRows: perRowFailedRows || [],
        };
        setDatasets((prev) => [datasetRecord, ...prev]);
        const summarySuffix = skippedDuplicates
          ? `${dedupedRows.length} new, ${skippedDuplicates} skipped as duplicates.`
          : `${dedupedRows.length} rows.`;
        message.success(`${file.name} imported (${summarySuffix})`);
        resolve(dedupedRows);
      } catch (error) {
        console.error('Import failed', error);
        // Provide a user-friendly message and include details in console
        const errorMsg = (error && error.message) ? error.message : String(error);
        // If error contains stack or nested errors, append additional messages for help
        const extra = error && error.stack ? `; stack: ${error.stack.split('\n')[0]}` : '';
        message.error(`Could not parse XLSX file: ${errorMsg}${extra}`);
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

    // Delete server-backed cases and collect results
    let serverDeleted = 0;
    let serverFailed = 0;
    await Promise.all(serverIds.map(async (id) => {
      try {
        await apiDeleteCase(id);
        serverDeleted += 1;
      } catch (err) {
        console.warn('Failed to delete server case', id, err);
        serverFailed += 1;
      }
    }));
    // Refresh server state after deletion attempts
    try {
      await loadCasesFromBackend();
      if (serverDeleted) {
        message.success(`Deleted ${serverDeleted} server cases and removed ${caseKeys.length - serverDeleted} local-only rows.`);
      }
      if (serverFailed) {
        message.warning(`Failed to delete ${serverFailed} server cases; they may remain on the backend.`);
      }
    } catch (err) {
      console.warn('Failed to reload cases after delete', err);
    }
  }, []);

  const retryFailedRows = useCallback(async (datasetKey) => {
    if (!datasetKey) return;
    const dataset = datasets.find((d) => d.key === datasetKey);
    if (!dataset || !dataset.rows || !dataset.rows.length) {
      message.info('No rows to retry for this dataset');
      return;
    }
    // Determine rows that likely failed on server import or per-row fallback
    const retryRows = dataset.failedRows && dataset.failedRows.length ? dataset.failedRows : dataset.rows;
    if (!retryRows.length) {
      message.info('No failed rows to retry');
      return;
    }
    let createdCount = 0;
    let failedCount = 0;
    for (const row of retryRows) {
      try {
        const payload = {
          title: row.title || row.formFields?.beneficiary_name || row.caseNumber || 'Case',
          description: row.notes || row.formFields?.extra_note || row.raw?.description || '',
          status: 'Pending',
          raw: row.raw || row,
        };
        const created = await apiCreateCase(payload);
        if (created && created.id) {
          createdCount += 1;
          // Mark row as created in dataset
          row.serverCreated = true;
          row.id = created.id;
        } else {
          failedCount += 1;
        }
      } catch (err) {
        failedCount += 1;
        console.warn('Retry failed for row', err);
      }
    }
    if (createdCount) {
      await loadCasesFromBackend();
    }
    message.success(`Retry finished: ${createdCount} created, ${failedCount} failed.`);
    // update the stored dataset
    setDatasets((prev) => prev.map((d) => d.key === datasetKey ? ({ ...d, rows: dataset.rows, failedRows: [] }) : d));
  }, [datasets, loadCasesFromBackend]);

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
    retryFailedRows,
    valueLang,
    setValueLang,
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
