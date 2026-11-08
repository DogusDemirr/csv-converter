import { expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { exportExcel } from './excel';
it('round trips Turkish text, leading zeros and formula payloads as string cells', async () => {
 const values = ['Çağrı İŞĞÜÖÇ ı', '00123', '=HYPERLINK("https://example.com")', '+SUM(1,2)', '-1+1', '@SUM(A1)', '\t=1+1', '\r=1+1'];
 const bytes = await exportExcel([['Value'], ...values.map(v => [v])]);
 const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes);
 const sheet = workbook.worksheets[0];
 values.forEach((value, i) => { const cell = sheet.getCell(i + 2, 1); expect(cell.value).toBe(value.replace(/\r/g, '\n')); expect(cell.type).toBe(ExcelJS.ValueType.String); expect(cell.formula).toBeUndefined(); });
 expect(sheet.getRow(1).font.bold).toBe(true);
 expect(sheet.views[0].state).toBe('frozen');
});

