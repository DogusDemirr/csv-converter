import { expect, it } from 'vitest';
import { readSheet } from 'read-excel-file/node';
import { unzipSync, strFromU8 } from 'fflate';
import { exportExcel } from './excel';
it('round trips Turkish text, leading zeros and formula payloads as string cells', async () => {
 const values = ['Çağrı İŞĞÜÖÇ ı', '00123', '=HYPERLINK("https://example.com")', '+SUM(1,2)', '-1+1', '@SUM(A1)', '\t=1+1', '\r=1+1'];
 const bytes = await exportExcel([['Value'], ...values.map(v => [v])]);
 const sheet = await readSheet(Buffer.from(bytes), {trim:false});
 const zip = unzipSync(new Uint8Array(bytes)); const xml = strFromU8(zip['xl/worksheets/sheet1.xml']);
 values.forEach((value, i) => expect(sheet[i + 1][0]).toBe(value));
 expect(xml).not.toMatch(/<f(?:\s|>)/); expect(xml).toContain('state="frozen"');
 expect(strFromU8(zip['xl/styles.xml'])).toContain('<b/>');
});
it('preserves date and number text, empty positions, Unicode and XML escapes', async () => {
 const rows = [['date','number','empty','text'],['2026-11-11','1234.50','','<script>& "Çağrı" 🌍'],['01/02/2026','-0.00','','last']];
 const bytes = await exportExcel(rows); const sheet = await readSheet(Buffer.from(bytes), {trim:false});
 expect(sheet).toEqual(rows.map(row => row.map(value => value === '' ? null : value)));
 const zip = unzipSync(new Uint8Array(bytes)); const xml = strFromU8(zip['xl/worksheets/sheet1.xml']);
 expect(xml).not.toMatch(/<f(?:\s|>)/); expect(xml).not.toContain('<script>');
 expect([...xml.matchAll(/<c\s[^>]*>/g)].every(match => /t="s"/.test(match[0]))).toBe(true);
});
it('rejects row, column, cell and text limits before workbook construction', async () => {
 await expect(exportExcel([])).rejects.toThrow('empty');
 await expect(exportExcel(Array.from({length:20001},()=>['x']))).rejects.toThrow('limits');
 await expect(exportExcel([Array(1001).fill('x')])).rejects.toThrow('limits');
 await expect(exportExcel(Array.from({length:201},()=>Array(1000).fill('x')))).rejects.toThrow('limits');
 await expect(exportExcel([['x'.repeat(32768)]])).rejects.toThrow('limits');
});
it('preserves prototype-like cell text as ordinary data', async () => {
 const rows=[['value'],['constructor'],['__proto__'],['toString'],['hasOwnProperty']];
 expect(await readSheet(Buffer.from(await exportExcel(rows)),{trim:false})).toEqual(rows);
});
it('rejects XML-invalid controls and isolated surrogates without dropping data', async () => {
 for(const value of ['\u0000','\u0001','\u000b','\ufffe','\ud800']) await expect(exportExcel([['value'],[value]])).rejects.toThrow('xml');
});
