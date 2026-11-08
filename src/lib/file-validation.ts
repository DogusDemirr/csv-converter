import { MAX_BYTES } from './limits';
export function validateFile(file: { name: string; size: number }) {
 if (!/\.csv$/i.test(file.name)) throw new Error('format');
 if (!file.size) throw new Error('empty');
 if (file.size > MAX_BYTES) throw new Error('size');
}
export async function readUtf8(file: Blob) {
 try { return new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); }
 catch { throw new Error('encoding'); }
}
