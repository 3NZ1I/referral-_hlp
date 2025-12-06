import XLSX from 'xlsx';
import { formSections, caseFieldMapping } from '../src/data/formMetadata.js';

const normalizeKey = (key = '') => key
  .toString()
  .trim()
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^\p{L}\p{N}]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();
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
  const token = stripped.match(/(partnernu1[_\s]*|partner[_\s]*|group_fj2tt69[_\s]*|partnernu1[_\s]*)(\d+[._-]?\d*)[\s:-_()]*([^\n\r]+)/i);
  if (token) {
    const rawSlot = token[2].replace(/[._-]/g, '_').replace(/^0+/, '');
    const labelPart = token[3];
    const suffix = rosterLabelSuffixIndex.get(normalizeKey(labelPart));
    if (suffix) {
      return `group_fj2tt69_partnernu1_${rawSlot}${suffix}`;
    }
  }
  const token2 = stripped.match(/([^\d]+)\s+(\d+[._-]?\d*)\b/i);
  if (token2) {
    const labelPart = token2[1];
    const rawSlot = token2[2].replace(/[._-]/g, '_').replace(/^0+/, '');
    const suffix = rosterLabelSuffixIndex.get(normalizeKey(labelPart));
    if (suffix) {
      return `group_fj2tt69_partnernu1_${rawSlot}${suffix}`;
    }
  }
  const token3 = stripped.match(/([^\(\)]+)\((\d+[._-]?\d*)\)/);
  if (token3) {
    const labelPart = token3[1];
    const rawSlot = token3[2].replace(/[._-]/g, '_').replace(/^0+/, '');
    const suffix = rosterLabelSuffixIndex.get(normalizeKey(labelPart));
    if (suffix) {
      return `group_fj2tt69_partnernu1_${rawSlot}${suffix}`;
    }
  }
  const token4 = stripped.match(/(\d+[._-]?\d*)/);
  if (token4) {
    const rawSlot = token4[1].replace(/[._-]/g, '_').replace(/^0+/, '');
    const labelGuess = stripped.replace(token4[0], '').trim();
    const suffix = rosterLabelSuffixIndex.get(normalizeKey(labelGuess));
    if (suffix) return `group_fj2tt69_partnernu1_${rawSlot}${suffix}`;
  }
  return null;
};

const args = process.argv.slice(2);
let filePath = args.find(arg => arg.endsWith('.xlsx')) || 'Kobo_v6 en.xlsx';

const wb = XLSX.readFile(filePath);

wb.SheetNames.forEach((sheetName, idx) => {
  console.log('---');
  console.log(`Sheet ${idx}: ${sheetName}`);
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const header = rows[0] || [];
  console.log('Header columns count:', header.length);
  const mappedHeaders = header.map((cell) => {
    const rosterCanonical = remapRosterHeader(cell);
    const normalized = normalizeKey(stripHtml(cell));
    const aliasCanonical = aliasToCanonicalIndex[normalized] || null;
    return { original: cell, normalized, aliasCanonical, rosterCanonical };
  });
  mappedHeaders.forEach((h, i) => {
    console.log(`${i.toString().padStart(3, ' ')} | ${h.original} -> ${h.normalized} | alias:${h.aliasCanonical || '-'} | roster:${h.rosterCanonical || '-'} `);
  });
});
