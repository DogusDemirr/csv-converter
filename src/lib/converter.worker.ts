import { parseCsv, validateFile, type Delimiter } from './csv';
import { readUtf8 } from './file-validation';
let rows: string[][] = [];
self.onmessage = async (event: MessageEvent<{ type: 'parse' | 'export'; file?: File; delimiter?: Delimiter }>) => {
  try {
    if (event.data.type === 'parse' && event.data.file) {
      rows = [];
      validateFile(event.data.file);
      const result = parseCsv(await readUtf8(event.data.file), event.data.delimiter);
      rows = result.rows;
      self.postMessage({ type: 'parsed', rows: rows.slice(0, 21), count: rows.length, columns: rows[0].length, delimiter: result.delimiter });
    } else {
      if (!rows.length) throw new Error('empty');
      const { exportExcel } = await import('./excel');
      const buffer = await exportExcel(rows);
      self.postMessage({ type: 'exported', buffer });
    }
  } catch (error) { self.postMessage({ type: 'error', code: error instanceof Error ? error.message : 'unknown' }); }
};
