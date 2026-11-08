import { runTool, type Options } from './tool-engine';
import { MAX_BYTES } from './csv';
import type { ToolId } from './tools';
self.onmessage = async ({ data }: MessageEvent<{ id: Exclude<ToolId, 'csv-to-excel'>; input: string; file?: File; options: Options }>) => {
 try {
  const excel = data.id.startsWith('excel-');
  if (data.file && (!data.file.size || data.file.size > MAX_BYTES)) throw new Error(data.file.size ? 'size' : 'empty');
  if (data.file && !(excel ? /\.xlsx$/i : data.id === 'csv-to-json' ? /\.csv$/i : /\.(json|txt)$/i).test(data.file.name)) throw new Error('format');
  const bytes = excel && data.file ? await data.file.arrayBuffer() : undefined;
  const input = !excel && data.file ? await data.file.text() : data.input;
  self.postMessage({ result: await runTool(data.id, input, data.options, bytes) });
 } catch (e) { self.postMessage({ error: e instanceof Error ? e.message : 'unknown' }); }
};
