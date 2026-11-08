export const MAX_BYTES = 5 * 1024 * 1024;
export function validateExportRows(rows: string[][]) {
 if (!rows.length) throw new Error('empty');
 let cells = 0;
 if (rows.length > 20000) throw new Error('limits');
 for (const row of rows) {
  cells += row.length;
  if (row.length > 1000 || cells > 200000 || row.some(value => value.length > 32767)) throw new Error('limits');
 }
}
