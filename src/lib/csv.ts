import Papa from 'papaparse';
export const MAX_BYTES = 5 * 1024 * 1024;
export type Delimiter = '' | ',' | ';' | '\t';
export function validateFile(file: { name: string; size: number }) {
  if (!/\.csv$/i.test(file.name)) throw new Error('format');
  if (!file.size) throw new Error('empty');
  if (file.size > MAX_BYTES) throw new Error('size');
}
export function parseCsv(text: string, delimiter: Delimiter = '') {
  if (text.includes('\u0000') || text.includes('\ufffd')) throw new Error('encoding');
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { delimiter, delimitersToGuess: [',', ';', '\t'], skipEmptyLines: 'greedy' });
  if (parsed.errors.some(e => e.code !== 'UndetectableDelimiter')) throw new Error('malformed');
  const rows = parsed.data;
  if (!rows.length) throw new Error('empty');
  const width = rows[0].length;
  if (rows.some(row => row.length !== width)) throw new Error('columns');
  if (rows.length > 20000 || rows.length * width > 200000 || width > 1000 || rows.some(r => r.some(c => c.length > 32767))) throw new Error('limits');
  return { rows, delimiter: parsed.meta.delimiter || delimiter || ',' };
}
