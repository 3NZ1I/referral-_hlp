import fs from 'fs';

// Lightweight parsing functions inspired by backfillFormFields
const normalizeKey = (key='') => key.toString().trim().toLowerCase();
const nr = normalizeKey;
const rosterPattern = /^group_fj2tt69_partnernu1_(\d+(?:_\d+)*)_(.+)$/;
const mapSuffixToField = (suffix) => {
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

const sampleRaw = {
  formFields: {
    'group_fj2tt69_partnernu1_1_partner_name': 'Fatima',
    'group_fj2tt69_partnernu1_1_partner_lastname': 'Hassan',
    'group_fj2tt69_partnernu1_1_partner_relation1': 'sister',
    'group_fj2tt69_partnernu1_1_partner_govreg': 'Yes',
    'group_fj2tt69_partnernu1_1_partner': '1980-01-01',
    'group_fj2tt69_partnernu1_2_partner_name': 'Ahmed',
    'group_fj2tt69_partnernu1_2_partner_lastname': 'Hassan',
    'group_fj2tt69_partnernu1_2_partner_relation1': 'husband',
    // Slash-containing keys from server-exported Kobo payload format
    'group_fj2tt69_partnernu1_7_1/group_fj2tt69_partnernu1_7_1_partner_name': 'حسناء',
    'group_fj2tt69_partnernu1_7_1/group_fj2tt69_partnernu1_7_1_partner_lastname': 'علي',
    'group_fj2tt69_partnernu1_7_1/group_fj2tt69_partnernu1_7_1_partner_relation1': 'partner_relationsup',
  }
};

const raw = sampleRaw;
const rawKeys = [...Object.keys(raw || {})];
if (raw.formFields && typeof raw.formFields === 'object') {
  Object.keys(raw.formFields).forEach((k) => { if (!rawKeys.includes(k)) rawKeys.push(k); });
}
// Build groups
const groups = {};
rawKeys.forEach((k) => {
  // Use the same normalized-key logic as the app: lower-case + replace non-alphanum with underscore
  let normalizedKey = nr(k).replace(/[^a-z0-9_]/g, '_');
  const lastIdx = normalizedKey.lastIndexOf('group_fj2tt69_partnernu1_');
  if (lastIdx > 0) normalizedKey = normalizedKey.slice(lastIdx);
  const m = normalizedKey.match(rosterPattern);
  if (!m) return;
  const slot = m[1].replace(/_+/g, '_');
  const suffix = m[2].replace(/^_+/, '').replace(/_+/g, '_');
  if (!groups[slot]) groups[slot] = {};
  const val = (k in raw) ? raw[k] : raw.formFields[k];
  groups[slot][suffix] = val;
});
const slotsToUse = Object.keys(groups).sort();
const rosterArr = slotsToUse.map((slot) => {
  const g = groups[slot];
  const obj = {};
  Object.entries(g).forEach(([suffix, val]) => {
    const mapped = mapSuffixToField(suffix) || suffix;
    if (val !== undefined && val !== null && val !== '') obj[mapped] = val;
  });
  obj.slot = slot;
  return Object.keys(obj).length ? obj : null;
}).filter(Boolean);
console.log('Parsed roster:', JSON.stringify(rosterArr, null, 2));

// Basic assertions to ensure server-style slashed keys are parsed into roster entries
if (!rosterArr.length) {
  console.error('Test failed: no roster entries parsed');
  process.exit(1);
}
// Ensure slot 7_1 exists and name 'حسناء' appears
const found7 = rosterArr.some((r) => r.slot === '7_1' && (r.name || '').includes('حسناء'));
if (!found7) {
  console.error('Test failed: expected slot 7_1 with name حسناء not found');
  process.exit(1);
}
console.log('Test passed: slash-keys parsed correctly into roster entries');
