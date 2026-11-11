import { describe, expect, it } from 'vitest';
import Papa from 'papaparse';
import { runTool, safeCsvCell } from './tool-engine';
import { MAX_BYTES } from './csv';
import { tools, isLegacyToolId } from './tools';
const ids = tools.map(t => t.id).filter(isLegacyToolId).filter(id => id !== 'csv-to-excel');
const token = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
describe('Enabled tools reject empty and oversized input', () => {
 it.each(ids)('%s empty', async id => { await expect(runTool(id, '')).rejects.toThrow('empty'); });
 it.each(ids)('%s size', async id => { await expect(runTool(id, 'x'.repeat(MAX_BYTES + 1))).rejects.toThrow('size'); });
});
describe('JSON formatter and minifier', () => {
 it.each(['json-formatter', 'json-minifier'] as const)('%s preserves Unicode and inert HTML/prototype keys', async id => {
  const source = '{"name":"Çağrı İŞĞÜÖÇ ı","html":"<script>alert(1)</script>","__proto__":{"polluted":true},"formula":"=1+1"}';
  expect(JSON.parse((await runTool(id, source)).text)).toEqual(JSON.parse(source));
  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
 });
 it.each(['json-formatter', 'json-minifier'] as const)('%s rejects invalid JSON and excessive depth', async id => { await expect(runTool(id, '{bad}')).rejects.toThrow('json'); await expect(runTool(id, '['.repeat(102) + '0' + ']'.repeat(102))).rejects.toThrow('limits'); });
 it('formats and minifies', async () => { expect((await runTool('json-formatter', '{"a":1}')).text).toBe('{\n  "a": 1\n}'); expect((await runTool('json-minifier', ' { "a": 1 } ')).text).toBe('{"a":1}'); });
 it.each(['json-formatter', 'json-minifier', 'json-to-csv'] as const)('%s rejects unsafe integers and numeric overflow', async id => { await expect(runTool(id, '[{"n":9007199254740993}]')).rejects.toThrow('number'); await expect(runTool(id, '[{"n":1e400}]')).rejects.toThrow('number'); });
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
it.each(['=1','+1','-1','@x',' \t=1','\tfoo','\rbar','\nbar','\0=1'])('escapes dangerous spreadsheet value %s', s => expect(safeCsvCell(s)).toBe(`'${s}`));
