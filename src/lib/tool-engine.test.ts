import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { runTool, safeCsvCell, checkWorkbookZip } from './tool-engine';
import { MAX_BYTES } from './csv';
import { tools } from './tools';
const ids = tools.map(t => t.id).filter(id => id !== 'csv-to-excel');
const token = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
async function xlsx(rows: unknown[][] = [['name'], ['Çağrı']]) {
 const book = new ExcelJS.Workbook(); book.addWorksheet('Türkçe').addRows(rows); book.addWorksheet('Second').addRows([['value'], ['second']]);
 const buffer = await book.xlsx.writeBuffer(); return new Uint8Array(buffer).buffer;
}
describe('All eight tools reject empty and oversized input', () => {
 it.each(ids)('%s empty', async id => { await expect(runTool(id, '')).rejects.toThrow('empty'); });
 it.each(ids)('%s size', async id => { await expect(runTool(id, 'x'.repeat(MAX_BYTES + 1), {}, id.startsWith('excel-') ? new ArrayBuffer(MAX_BYTES + 1) : undefined)).rejects.toThrow('size'); });
});
describe('JSON formatter and minifier', () => {
 it.each(['json-formatter', 'json-minifier'] as const)('%s preserves Unicode and inert HTML/prototype keys', async id => {
  const source = '{"name":"Çağrı İŞĞÜÖÇ ı","html":"<script>alert(1)</script>","__proto__":{"polluted":true},"formula":"=1+1"}';
  expect(JSON.parse((await runTool(id, source)).text)).toEqual(JSON.parse(source));
  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
 });
 it.each(['json-formatter', 'json-minifier'] as const)('%s rejects invalid JSON and excessive depth', async id => { await expect(runTool(id, '{bad}')).rejects.toThrow('json'); await expect(runTool(id, '['.repeat(102) + '0' + ']'.repeat(102))).rejects.toThrow('limits'); });
 it('formats and minifies', async () => { expect((await runTool('json-formatter', '{"a":1}')).text).toBe('{\n  "a": 1\n}'); expect((await runTool('json-minifier', ' { "a": 1 } ')).text).toBe('{"a":1}'); });
});
describe('JSON to CSV', () => {
 it('unions fields, quotes nested text and preserves Unicode', async () => {
  const result = await runTool('json-to-csv', '[{"ad":"Çağrı","nested":{"x":1}},{"ad":"İzmir","other":true}]');
  expect(Papa.parse<string[]>(result.text).data).toEqual([['ad','nested','other'],['Çağrı','{"x":1}',''],['İzmir','','true']]);
 });
 it.each(['null','[]','[1]','[null]','[[]]','{}','broken'])('rejects invalid records %s', async input => { await expect(runTool('json-to-csv', input)).rejects.toThrow(); });
 it('rejects empty headers and excessive records', async () => { await expect(runTool('json-to-csv', '[{}]')).rejects.toThrow('headers'); await expect(runTool('json-to-csv', JSON.stringify(Array.from({ length: 20000 }, () => ({ a: 1 }))))).rejects.toThrow('limits'); });
 it('protects header and value formulas, including whitespace prefixes', async () => { const result = await runTool('json-to-csv', JSON.stringify([{ '=header': '  =1+1', x: '@SUM(A1)', y: '\t=1+1' }])); const rows = Papa.parse<string[]>(result.text).data; expect(rows[0][0]).toBe("'=header"); expect(rows[1]).toEqual(["'  =1+1", "'@SUM(A1)", "'\t=1+1"]); });
});
describe('CSV to JSON', () => {
 it('handles BOM, Turkish, quoted values and leading zero strings', async () => { const r = await runTool('csv-to-json', '\uFEFFad;id\n"Çağrı";001', { delimiter: ';' }); expect(JSON.parse(r.text)).toEqual([{ ad: 'Çağrı', id: '001' }]); });
 it.each(['a,a\nx,y', ',a\nx,y', 'a,b\nx,y,z', 'a,b\n"broken,x'])('rejects invalid data %s', async input => { await expect(runTool('csv-to-json', input, { delimiter: ',' })).rejects.toThrow(); });
 it('uses safe own properties for prototype names and preserves inert HTML', async () => { const r = JSON.parse((await runTool('csv-to-json', '__proto__,html\nhello,<script>x</script>', { delimiter: ',' })).text); expect(r[0].__proto__).toBe('hello'); expect(r[0].html).toBe('<script>x</script>'); expect(({} as Record<string, unknown>).hello).toBeUndefined(); });
 it('bounds table size', async () => { await expect(runTool('csv-to-json', 'a\n' + 'x\n'.repeat(20000))).rejects.toThrow('limits'); });
});
describe('Base64', () => {
 it('round trips Turkish Unicode and emoji', async () => { const text = 'Çağrı İŞĞÜÖÇ ı 🌍'; const encoded = (await runTool('base64', text)).text; expect((await runTool('base64', encoded, { mode: 'decode' })).text).toBe(text); });
 it.each(['!!!', 'a', '/w==', 'Zg=','Zh=='])('rejects malformed or binary text %s', async input => { await expect(runTool('base64', input, { mode: 'decode' })).rejects.toThrow('base64'); });
 it('never interprets decoded HTML', async () => { const source = '<script>alert(1)</script>'; const result = await runTool('base64', btoa(source), { mode: 'decode' }); expect(result.text).toBe(source); });
});
describe('JWT decoder', () => {
 it('decodes Unicode claims without asserting verification', async () => { const result = await runTool('jwt-decoder', `${token({ alg:'none' })}.${token({ name:'Çağrı', exp: 0 })}.`); expect(JSON.parse(result.text)).toEqual({ header:{ alg:'none' }, payload:{ name:'Çağrı',exp:0 },signatureVerified:false }); });
 it.each(['a.b', 'a.b.c.d', '!!.!!.x', `${token([])}.${token({})}.x`, `${token({})}.${token('bad')}.x`, `${token({})}.${token({})}.!`])('rejects malformed token %s', async input => { await expect(runTool('jwt-decoder', input)).rejects.toThrow('jwt'); });
 it('treats embedded markup as data', async () => { const r = await runTool('jwt-decoder', `${token({alg:'HS256'})}.${token({html:'<img src=x onerror=alert(1)>'})}.invalidSignature`); expect(JSON.parse(r.text).payload.html).toContain('<img'); expect(JSON.parse(r.text).signatureVerified).toBe(false); });
});
describe('Excel to CSV and JSON', () => {
 it.each(['excel-to-csv', 'excel-to-json'] as const)('%s handles Turkish, cached formulas and literal payloads', async id => {
  const bytes = await xlsx([['name','formula','missing'], ['Çağrı', { formula:'1+1', result:2 }, { formula:'HYPERLINK("https://example.com")' }], ['=1+1','001','<script>']]);
  const result = await runTool(id, '', {}, bytes); expect(result.sheets).toEqual(['Türkçe','Second']);
  if (id === 'excel-to-json') expect(JSON.parse(result.text)).toEqual([{name:'Çağrı',formula:'2',missing:''},{name:'=1+1',formula:'001',missing:'<script>'}]);
  else { expect(Papa.parse<string[]>(result.text).data[1]).toEqual(['Çağrı','2','']); expect(Papa.parse<string[]>(result.text).data[2][0]).toBe("'=1+1"); }
 });
 it.each(['excel-to-csv', 'excel-to-json'] as const)('%s rejects corrupt or empty workbooks', async id => { await expect(runTool(id, '', {}, new Uint8Array([1,2,3]).buffer)).rejects.toThrow('workbook'); await expect(runTool(id, '', {}, await xlsx([]))).rejects.toThrow('empty'); });
 it.each(['excel-to-csv', 'excel-to-json'] as const)('%s enforces table size', async id => { const book = new ExcelJS.Workbook(); book.addWorksheet('large').getCell('A20001').value = 'x'; const data = new Uint8Array(await book.xlsx.writeBuffer()).buffer; await expect(runTool(id,'',{},data)).rejects.toThrow('limits'); });
 it('selects a worksheet and rejects invalid sheet indexes', async () => { const bytes = await xlsx(); expect(JSON.parse((await runTool('excel-to-json','',{sheet:1},bytes)).text)).toEqual([{value:'second'}]); await expect(runTool('excel-to-json','',{sheet:9},bytes)).rejects.toThrow('sheet'); });
 it('rejects duplicate headers for JSON', async () => { await expect(runTool('excel-to-json','',{},await xlsx([['a','a'],['x','y']]))).rejects.toThrow('headers'); });
 it('rejects excessive declared ZIP expansion before decompression', async () => { const bytes = await xlsx(); const view = new DataView(bytes); for(let i=0;i<bytes.byteLength-46;i++) if(view.getUint32(i,true)===0x02014b50){ view.setUint32(i+24,31*1024*1024,true);break; } expect(() => checkWorkbookZip(bytes)).toThrow('limits'); });
});
it.each(['=1','+1','-1','@x',' \t=1','\tfoo','\rbar','\nbar'])('escapes dangerous spreadsheet value %s', s => expect(safeCsvCell(s)).toBe(`'${s}`));
