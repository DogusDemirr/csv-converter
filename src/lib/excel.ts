import ExcelJS from 'exceljs';
import { validateExportRows } from './limits';
export async function exportExcel(rows: string[][]) {
  validateExportRows(rows);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('CSV data');
  // Strings are never formula objects: preserve data without executing it.
  for (const row of rows) sheet.addRow(row.map(value => String(value)));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.columns.forEach(column => { column.width = 24; });
  return workbook.xlsx.writeBuffer();
}
