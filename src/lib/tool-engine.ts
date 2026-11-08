import type { Delimiter } from './csv';
import { MAX_BYTES } from './limits';
import type { ToolId } from './tools';
import { requireEnabledTool } from './security-policy';
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
async function csv(rows: string[][], delimiter: Delimiter = ',') { const { default: Papa } = await import('papaparse'); return '\uFEFF' + Papa.unparse(rows.map(r => r.map(safeCsvCell)), { delimiter: delimiter || ',', newline: '\r\n' }); }
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
export async function runTool(id: Exclude<ToolId, 'csv-to-excel'>, input: string, options: Options = {}): Promise<Result> {
 requireEnabledTool(id);
 let result: Result;
 if (id === 'excel-to-csv' || id === 'excel-to-json') {
  throw new Error('xlsx-disabled');
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
    const rows = [headers, ...value.map(v => headers.map(h => Object.hasOwn(v, h) ? cell(v[h]) : ''))];
    if (rows.some(r => r.some(v => v.length > 32767))) throw new Error('limits');
    result = { text: await csv(rows, options.delimiter), extension: 'csv' }; break;
   }
   case 'csv-to-json': { const { parseCsv } = await import('./csv'); result = { text: JSON.stringify(records(parseCsv(input, options.delimiter).rows), null, 2), extension: 'json' }; break; }
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
