import { runTool, type Options } from './tool-engine';
import { MAX_BYTES } from './limits';
import { readUtf8 } from './file-validation';
import type { ToolId } from './tools';
import { requireEnabledTool } from './security-policy';
self.onmessage = async ({ data }: MessageEvent<{ id: Exclude<ToolId, 'csv-to-excel'>; input: string; file?: File; options: Options }>) => {
 try {
  // Reject before reading file bytes, importing a parser or decompressing an archive.
  requireEnabledTool(data.id);
  const excel = data.id.startsWith('excel-');
  if (data.file && (!data.file.size || data.file.size > MAX_BYTES)) throw new Error(data.file.size ? 'size' : 'empty');
  if (data.file && !(excel ? /\.xlsx$/i : data.id === 'csv-to-json' ? /\.csv$/i : /\.(json|txt)$/i).test(data.file.name)) throw new Error('format');
  const input = !excel && data.file ? await readUtf8(data.file) : data.input;
  self.postMessage({ result: await runTool(data.id, input, data.options) });
 } catch (e) { self.postMessage({ error: e instanceof Error ? e.message : 'unknown' }); }
};
