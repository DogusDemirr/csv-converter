import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { MAX_BYTES, parseCsv, type Delimiter } from './csv';
import type { ToolId } from './tools';
export type Options = { mode?: 'encode' | 'decode'; delimiter?: Delimiter; sheet?: number };
export type Result = { text: string; extension: 'json' | 'csv' | 'txt'; sheets?: string[]; cachedOnly?: boolean };
export function checkText(text: string) {
 if (!text.trim()) throw new Error('empty');
 if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('size');
}
function checkStructure(value: unknown) {
 const stack: [unknown, number][] = [[value, 0]]; let nodes = 0;
 while (stack.length) {
  const [item, depth] = stack.pop()!;
  if (++nodes > 200000 || depth > 100) throw new Error('limits');
  if (typeof item === 'number' && (!Number.isFinite(item) || (Number.isInteger(item) && !Number.isSafeInteger(item)))) throw new Error('number');
  if (item && typeof item === 'object') for (const v of Object.values(item)) stack.push([v, depth + 1]);
 }
}
function json(text: string): unknown {
 checkText(text); let value: unknown;
 try { value = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('json'); }
 checkStructure(value); return value;
}
function cell(value: unknown): string { return value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value); }
export function safeCsvCell(value: string) {
 let index = 0;
 while (index < value.length && (/\s/u.test(value[index]) || value.charCodeAt(index) < 32 || (value.charCodeAt(index) >= 127 && value.charCodeAt(index) <= 159))) index++;
 return '=+-@'.includes(value[index] ?? '\uFFFF') || /^[\t\r\n]/.test(value) ? `'${value}` : value;
}
function csv(rows: string[][], delimiter: Delimiter = ',') { return '\uFEFF' + Papa.unparse(rows.map(r => r.map(safeCsvCell)), { delimiter: delimiter || ',', newline: '\r\n' }); }
function records(rows: string[][]) {
 const headers = rows[0];
 if (headers.some(h => !h.trim()) || new Set(headers).size !== headers.length) throw new Error('headers');
 return rows.slice(1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])));
}
function decode64(text: string, url = false) {
 let normalized = text.trim();
 if (url) { if (!/^[A-Za-z0-9_-]+$/.test(normalized)) throw new Error('base64'); normalized = normalized.replace(/-/g, '+').replace(/_/g, '/'); normalized += '='.repeat((4 - normalized.length % 4) % 4); }
 if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) throw new Error('base64');
 try { const raw = atob(normalized); if (btoa(raw) !== normalized) throw new Error(); return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(raw, c => c.charCodeAt(0))); } catch { throw new Error('base64'); }
}
// Read ZIP directory sizes before ExcelJS decompression to bound compressed workbook expansion.
export function checkWorkbookZip(bytes: ArrayBuffer) {
 if (!bytes.byteLength) throw new Error('empty');
 if (bytes.byteLength > MAX_BYTES) throw new Error('size');
 const view = new DataView(bytes); let end = -1;
 for (let i = bytes.byteLength - 22; i >= Math.max(0, bytes.byteLength - 65557); i--) if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.byteLength) { end = i; break; }
 if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error('workbook');
 const count = view.getUint16(end + 10, true); let offset = view.getUint32(end + 16, true); let size = 0;
 if (count > 2000 || count === 65535) throw new Error('limits');
 for (let n = 0; n < count; n++) {
  if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw new Error('workbook');
  if (view.getUint16(offset + 8, true) & 1) throw new Error('workbook');
  size += view.getUint32(offset + 24, true); if (size > 30 * 1024 * 1024) throw new Error('limits');
  offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
 }
 if (offset > end) throw new Error('workbook');
}
async function workbookRows(bytes: ArrayBuffer, sheetIndex = 0) {
 checkWorkbookZip(bytes); const book = new ExcelJS.Workbook();
 try { await book.xlsx.load(bytes); } catch { throw new Error('workbook'); }
 const sheet = book.worksheets[sheetIndex]; if (!sheet) throw new Error('sheet');
 if (sheet.rowCount > 20000 || sheet.columnCount > 1000 || sheet.rowCount * sheet.columnCount > 200000) throw new Error('limits');
 const rows: string[][] = []; const width = sheet.columnCount;
 sheet.eachRow(row => {
  const values = Array.from({ length: width }, (_, i) => {
   const c = row.getCell(i + 1); let value = c.value;
   if (value && typeof value === 'object' && ('formula' in value || 'sharedFormula' in value)) value = c.result ?? null;
   const result = value instanceof Date ? value.toISOString() : value && typeof value === 'object' ? 'richText' in value ? value.richText.map(t => t.text).join('') : 'text' in value ? value.text : 'error' in value ? value.error : '' : cell(value);
   if (result.length > 32767) throw new Error('limits'); return result;
  });
  if (values.some(v => v.trim())) rows.push(values);
 });
 if (!rows.length) throw new Error('empty'); return { rows, sheets: book.worksheets.map(s => s.name) };
}
export async function runTool(id: Exclude<ToolId, 'csv-to-excel'>, input: string, options: Options = {}, bytes?: ArrayBuffer): Promise<Result> {
 let result: Result;
 if (id === 'excel-to-csv' || id === 'excel-to-json') {
  if (!bytes) throw new Error('empty'); const { rows, sheets } = await workbookRows(bytes, options.sheet);
  result = { text: id === 'excel-to-csv' ? csv(rows, options.delimiter) : JSON.stringify(records(rows), null, 2), extension: id === 'excel-to-csv' ? 'csv' : 'json', sheets, cachedOnly: true };
 } else {
  checkText(input);
  switch (id) {
   case 'json-formatter': result = { text: JSON.stringify(json(input), null, 2), extension: 'json' }; break;
   case 'json-minifier': result = { text: JSON.stringify(json(input)), extension: 'json' }; break;
   case 'json-to-csv': {
    const value = json(input);
    if (!Array.isArray(value) || !value.length || value.some(v => !v || typeof v !== 'object' || Array.isArray(v))) throw new Error('records');
    const headers = [...new Set(value.flatMap(v => Object.keys(v)))];
    if (!headers.length || headers.some(h => !h.trim())) throw new Error('headers');
    if (value.length + 1 > 20000 || headers.length > 1000 || (value.length + 1) * headers.length > 200000) throw new Error('limits');
    const rows = [headers, ...value.map(v => headers.map(h => cell(v[h])))];
    if (rows.some(r => r.some(v => v.length > 32767))) throw new Error('limits');
    result = { text: csv(rows, options.delimiter), extension: 'csv' }; break;
   }
   case 'csv-to-json': result = { text: JSON.stringify(records(parseCsv(input, options.delimiter).rows), null, 2), extension: 'json' }; break;
   case 'base64': {
    if (options.mode === 'decode') result = { text: decode64(input), extension: 'txt' };
    else { const data = new TextEncoder().encode(input); let binary = ''; for (let i = 0; i < data.length; i += 8192) binary += String.fromCharCode(...data.subarray(i, i + 8192)); result = { text: btoa(binary), extension: 'txt' }; } break;
   }
   case 'jwt-decoder': {
    const parts = input.trim().split('.');
    if (parts.length !== 3 || !/^[A-Za-z0-9_-]*$/.test(parts[2])) throw new Error('jwt');
    let header: unknown, payload: unknown;
    try { header = json(decode64(parts[0], true)); payload = json(decode64(parts[1], true)); } catch { throw new Error('jwt'); }
    if (!header || !payload || typeof header !== 'object' || typeof payload !== 'object' || Array.isArray(header) || Array.isArray(payload)) throw new Error('jwt');
    result = { text: JSON.stringify({ header, payload, signatureVerified: false }, null, 2), extension: 'json' }; break;
   }
  }
 }
 if (new TextEncoder().encode(result.text).length > 15 * 1024 * 1024) throw new Error('limits');
 return result;
}
