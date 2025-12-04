/* eslint-env node */
const fs = require('fs');
const path = require('path');

const xmlPath = path.resolve(__dirname, '..', 'xml example');
const xml = fs.readFileSync(xmlPath, 'utf8');

const decodeEntities = (text = '') => text
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const translations = {};

const mapLang = (raw) => {
  if (/Arabic/i.test(raw)) return 'ar';
  if (/English/i.test(raw)) return 'en';
  return raw;
};

const translationRegex = /<translation lang="([^"]+)"[^>]*>([\s\S]*?)<\/translation>/g;
let translationMatch;
while ((translationMatch = translationRegex.exec(xml))) {
  const lang = mapLang(translationMatch[1]);
  const block = translationMatch[2];
  translations[lang] = translations[lang] || {};
  const textRegex = /<text id="([^"]+)">([\s\S]*?)<\/text>/g;
  let textMatch;
  while ((textMatch = textRegex.exec(block))) {
    const id = textMatch[1];
    const valueMatch = textMatch[2].match(/<value[^>]*>([\s\S]*?)<\/value>/);
    if (!valueMatch) continue;
    const value = decodeEntities(valueMatch[1]).trim();
    translations[lang][id] = value;
  }
}

const selectOptions = {};
const instanceRegex = /<instance id="([^"]+)">([\s\S]*?)<\/instance>/g;
let instanceMatch;
while ((instanceMatch = instanceRegex.exec(xml))) {
  const id = instanceMatch[1];
  const body = instanceMatch[2];
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(body))) {
    const itextIdMatch = itemMatch[1].match(/<itextId>([\s\S]*?)<\/itextId>/);
    const nameMatch = itemMatch[1].match(/<name>([\s\S]*?)<\/name>/);
    if (!nameMatch) continue;
    const value = decodeEntities(nameMatch[1].trim());
    const option = { value };
    if (itextIdMatch) {
      const itextId = itextIdMatch[1].trim();
      const labelAr = translations.ar?.[itextId];
      const labelEn = translations.en?.[itextId];
      if (labelAr || labelEn) {
        option.label = {};
        if (labelEn) option.label.en = labelEn;
        if (labelAr) option.label.ar = labelAr;
      }
    }
    items.push(option);
  }
  if (items.length) {
    selectOptions[id] = items;
  }
}

console.log(JSON.stringify(selectOptions, null, 2));
