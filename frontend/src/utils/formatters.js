import dayjs from 'dayjs';
import { selectOptions } from '../data/formMetadata';

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.trim() ? value.trim().split(/\s+/) : [];
  }
  return value ? [value] : [];
};

const normalizeKey = (key = '') => {
  if (!key || typeof key !== 'string') return '';
  return stripFormatting(key).toLowerCase();
};

export const getOptionLabel = (optionsKey, optionValue, lang = 'en') => {
  const catalog = (selectOptions && selectOptions[optionsKey]) || [];
  if (optionValue === undefined || optionValue === null) return '';
  const normalizedInput = normalizeKey(String(optionValue || ''));
  // Prefer exact value match
  const byValue = catalog.find((opt) => String(opt.value) === String(optionValue));
  if (byValue) return (byValue.label && (byValue.label[lang] || byValue.label.en)) || String(optionValue);
  // Fallback: match against English/Arabic labels (some imports may use labels instead of values)
  const byLabel = catalog.find((opt) => {
    const en = (opt.label && opt.label.en) ? normalizeKey(opt.label.en) : '';
    const ar = (opt.label && opt.label.ar) ? normalizeKey(opt.label.ar) : '';
    return normalizedInput === en || normalizedInput === ar;
  });
  if (byLabel) return (byLabel.label && (byLabel.label[lang] || byLabel.label.en)) || String(optionValue);
  // If there's no match, return the input value as-is
  return String(optionValue);
};

export const stripFormatting = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/__+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const excelSerialToDate = (value) => {
  const serial = Number(value);
  if (!Number.isFinite(serial)) return null;
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 24 * 60 * 60 * 1000);
};

export const parseDateValue = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const parsed = excelSerialToDate(value);
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      const parsed = excelSerialToDate(numeric);
      if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

export const formatDateDisplay = (value) => {
  const parsed = parseDateValue(value);
  return parsed ? parsed.toLocaleDateString() : '—';
};

export const formatFieldValue = (rawValue, field, lang = 'en') => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return '—';
  }

  if (field?.optionsKey) {
    const values = field.type === 'select_multiple' ? asArray(rawValue) : [rawValue];
    if (!values.length) return '—';
    return values.map((value) => getOptionLabel(field.optionsKey, value, lang)).join(', ');
  }

  if (field?.type === 'date') {
    return formatDateDisplay(rawValue) || rawValue;
  }

  if (field?.type === 'datetime') {
    const parsed = parseDateValue(rawValue);
    return parsed ? parsed.toLocaleString() : rawValue;
  }

  return rawValue;
};

export default {
  getOptionLabel,
  formatFieldValue,
  parseDateValue,
  formatDateDisplay,
};
