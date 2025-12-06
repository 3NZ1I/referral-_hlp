import XLSX from 'xlsx';
import fs from 'fs';
import { normalizeKey } from '../src/context/CasesContext.mjs' assert { type: 'json' };

// Re-create mapping test for category labels: we'll use selectOptions from formMetadata
import selectOptions from '../src/data/selectOptions.generated.json' assert { type: 'json' };

const optionsKey = 'sj0rz77'; // engineering referral type
const catalog = selectOptions[optionsKey] || [];

const findLabel = (value, lang='en') => {
  const opt = catalog.find(o => o.value === value);
  return opt ? ((opt.label && (opt.label[lang] || opt.label.en)) || opt.value) : null;
}

const randomValue = catalog && catalog[0] && catalog[0].value;
const valueLabelEn = findLabel(randomValue, 'en');
const valueLabelAr = findLabel(randomValue, 'ar');

console.log('Testing mapping for value -> label translations for', optionsKey);
console.log('Value:', randomValue, 'EN label:', valueLabelEn, 'AR label:', valueLabelAr);

// Test flow: simulate the file contains the EN label (valueLabelEn) and see mapping result
import { getOptionLabel } from '../src/utils/formatters.mjs';

console.log('getOptionLabel by value (EN):', getOptionLabel(optionsKey, randomValue, 'en'));
console.log('getOptionLabel by EN label (en->ar):', getOptionLabel(optionsKey, valueLabelEn, 'ar'));
console.log('getOptionLabel by AR label (ar->en):', getOptionLabel(optionsKey, valueLabelAr, 'en'));
