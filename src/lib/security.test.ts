import { expect, it, vi } from 'vitest';
import { runTool } from './tool-engine';
import { tools } from './tools';
import { exportExcel } from './excel';
import { validateExportRows } from './limits';
it.each(['excel-to-csv', 'excel-to-json'] as const)('%s is rejected for every input before decompression', async id => {
 const valid = new Uint8Array(await exportExcel([['name'],['Çağrı']])).buffer;
 for (const bytes of [undefined, new ArrayBuffer(0), new Uint8Array([0x50,0x4b,0xff]).buffer, valid]) await expect(Reflect.apply(runTool, undefined, [id, '', {}, bytes])).rejects.toThrow('xlsx-disabled');
 expect(tools.some(t=>t.id===id)).toBe(false);
});
it.each(['excel-to-csv','excel-to-json'])('%s worker rejects before touching File methods or sizes', async id => {
 const postMessage = vi.fn(); const fakeSelf = { onmessage: undefined as unknown, postMessage };
 vi.stubGlobal('self', fakeSelf);
 try {
  await import('./tools.worker');
  const read = vi.fn(() => { throw new Error('file must not be read'); });
  const handler = fakeSelf.onmessage as (event: unknown) => Promise<void>;
  for (const size of [0, 3, 5 * 1024 * 1024 + 1]) await handler({ data: { id, file: {name:'untrusted.xlsx',size,arrayBuffer:read,text:read}, input:'',options:{} } });
  expect(read).not.toHaveBeenCalled(); expect(postMessage).toHaveBeenCalledTimes(3); expect(postMessage).toHaveBeenCalledWith({error:'xlsx-disabled'});
 } finally { vi.unstubAllGlobals(); vi.resetModules(); }
});
it('bounds safe XLSX export before constructing a workbook', () => {
 expect(()=>validateExportRows([])).toThrow('empty');
 expect(()=>validateExportRows(Array.from({length:20001},()=>['x']))).toThrow('limits');
 expect(()=>validateExportRows([Array(1001).fill('x')])).toThrow('limits');
 expect(()=>validateExportRows(Array.from({length:201},()=>Array(1000).fill('x')))).toThrow('limits');
 expect(()=>validateExportRows([['x'.repeat(32768)]])).toThrow('limits');
});
it('enforces limits at the export entry point too', async () => {
 await expect(exportExcel([['x'.repeat(32768)]])).rejects.toThrow('limits');
 await expect(exportExcel([])).rejects.toThrow('empty');
});
