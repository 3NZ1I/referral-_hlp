import XLSX from 'xlsx';
import { formSections, caseFieldMapping } from '../src/data/formMetadata.js';

const normalizeKey = (key = '') => key
  .toString()
  .trim()
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\p{M}]+/gu, '')
  .replace(/[^\p{L}\p{N}]+/gu, '');

const stripHtml = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ');

const collectLabelAliases = (label = {}) => ['en', 'ar']
  .map((locale) => {
    const raw = label[locale];
    if (!raw || typeof raw !== 'string') return '';
    return stripHtml(raw).trim();
  })
  .filter(Boolean);

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

const buildAliasToCanonicalIndex = (aliasIndex = {}) => Object.entries(aliasIndex).reduce((acc, [canonical, aliases]) => {
  (aliases || []).forEach((alias) => {
    if (!acc[alias]) acc[alias] = canonical;
  });
  return acc;
}, {});

const fieldAliasIndex = buildAliasIndex(formSections);
const caseFieldAliasIndex = buildCaseFieldAliasIndex(caseFieldMapping);
const aliasToCanonicalIndex = (() => {
  const index = buildAliasToCanonicalIndex(fieldAliasIndex);
  const caseIndex = buildAliasToCanonicalIndex(caseFieldAliasIndex);
  Object.entries(caseIndex).forEach(([alias, canonical]) => {
    if (!index[alias]) index[alias] = canonical;
  });
  return index;
})();

const rosterLabelSuffixIndex = new Map([
  ['صلة القرابة', '_partner_relation1'],
  ['kinship ties', '_partner_relation1'],
  ['مسجل في الاحوال المدنية', '_partner_govreg'],
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
].map(([label, suffix]) => [normalizeKey(label), suffix]));

const remapRosterHeader = (rawCell = '') => {
  if (typeof rawCell !== 'string') return null;
  const stripped = stripHtml(rawCell).trim();
  const match = stripped.match(/(partnernu1_[^\s-]+)[\s-]+(.+)/i);
  if (!match) return null;
  const slotPart = match[1].replace(/\s+/g, '');
  const labelPart = match[2].replace(/[_*]/g, '').trim();
  const suffix = rosterLabelSuffixIndex.get(normalizeKey(labelPart));
  if (!suffix) return null;
  return `group_fj2tt69_${slotPart}${suffix}`;
};

const args = process.argv.slice(2);
let filePath = 'HLP_Syrbanism_-_all_versions_-_Arabic_ar_-_2025-12-02-20-25-33.xlsx';
let sampleRowIndex = 2; // default to row 2 (3rd row) because row 1 often contains blank test data

args.forEach((arg) => {
  if (arg.startsWith('--file=')) {
    filePath = arg.slice('--file='.length);
  } else if (arg.startsWith('--row=')) {
    sampleRowIndex = Number(arg.slice('--row='.length));
  } else if (arg.endsWith('.xlsx')) {
    filePath = arg;
  } else if (/^\d+$/.test(arg)) {
    sampleRowIndex = Number(arg);
  }
});

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
const header = rows[0] || [];

const mappedHeaders = header.map((cell) => {
  const rosterCanonical = remapRosterHeader(cell);
  if (rosterCanonical) return rosterCanonical;
  const normalized = normalizeKey(stripHtml(cell));
  return aliasToCanonicalIndex[normalized] || normalized;
});

const interestingHeaders = header.filter(h => /عدد|Children|Family members/i.test(h));
console.log('Potential matches for number fields:', interestingHeaders);

const interestingKeys = [
  'case_id',
  'staff_name',
  'work_location',
  'beneficiary_name',
  'beneficiary_last_name',
  'beneficiary_father',
  'beneficiary_mother',
  'beneficiary_birth_date',
  'beneficiary_birth_place',
  'ben_gender',
  'beneficiary_civil_status',
  'beneficiary_civil_status_other',
  'main_number',
  'back_number',
  'group_fj2tt69_partnernu1_7_1_partner_relation1',
  'group_fj2tt69_partnernu1_7_1_partner_govreg',
  'group_fj2tt69_partnernu1_7_1_partner_name',
  'group_fj2tt69_partnernu1_7_1_partner_lastname',
  'group_fj2tt69_partnernu1_7_1_partner',
  'group_fj2tt69_partnernu1_7_1_partner_nationality',
  'kids_under18',
  'fam_number',
];

console.log('Header mapping summary (index | canonical | original header text):');
interestingKeys.forEach((key) => {
  const index = mappedHeaders.indexOf(key);
  if (index >= 0) {
    console.log(`${index.toString().padStart(3, ' ')} | ${key} | ${header[index]}`);
  } else {
    console.log(`--- | ${key} | NOT FOUND`);
  }
});

console.log('\nSample row data for the same columns (row 2 if present):');
const sampleRow = rows[sampleRowIndex] || rows[2] || rows[1] || [];
interestingKeys.forEach((key) => {
  const index = mappedHeaders.indexOf(key);
  if (index >= 0) {
    console.log(`${key}: ${sampleRow[index] ?? ''}`);
  }
});
