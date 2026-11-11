export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export const INPUT_BYTES = 1024 * 1024;
export const OUTPUT_BYTES = 1024 * 1024;
export const byteSize = (text: string) => new TextEncoder().encode(text).length;
export function checkInput(...inputs: string[]) {
 if (inputs.reduce((sum, text) => sum + byteSize(text), 0) > INPUT_BYTES) throw new Error('input-limit');
}
export function parseJson(text: string, side: 'left' | 'right' | 'input' = 'input'): { value: Json; nodes: number } {
 checkInput(text);
 if (!text.trim()) throw new Error(`empty-${side}`);
 let value: Json;
 try { value = JSON.parse(text.replace(/^\uFEFF/, '')) as Json; } catch { throw new Error(`invalid-${side}`); }
 const stack: [Json, number][] = [[value, 0]]; let nodes = 0;
 while (stack.length) {
  const [item, depth] = stack.pop()!;
  if (++nodes > 50000 || depth > 50) throw new Error('structure-limit');
  if (typeof item === 'number' && (!Number.isFinite(item) || (Number.isInteger(item) && !Number.isSafeInteger(item)))) throw new Error('unsafe-number');
  if (item && typeof item === 'object') for (const child of Object.values(item)) stack.push([child, depth + 1]);
 }
 // Input is JSON text, never an object reference: cyclic graphs cannot enter this traversal.
 return { value, nodes };
}
