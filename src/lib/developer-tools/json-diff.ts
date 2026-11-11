import { byteSize, checkInput, OUTPUT_BYTES, parseJson, type Json } from './json';
export type Difference = { kind: 'added' | 'removed' | 'changed'; path: string; before?: Json; after?: Json };
export function jsonDiff(left: string, right: string) {
 checkInput(left, right);
 const a = parseJson(left, 'left'); const b = parseJson(right, 'right');
 if (a.nodes + b.nodes > 50000) throw new Error('structure-limit');
 const changes: Difference[] = []; let bytes = 0;
 function add(change: Difference) {
  bytes += byteSize(JSON.stringify(change, null, 2)) + 100;
  if (changes.length >= 2000 || bytes > OUTPUT_BYTES) throw new Error('output-limit');
  changes.push(change);
 }
 function visit(before: Json, after: Json, path: string) {
  if (before === after) return;
  if (Array.isArray(before) && Array.isArray(after)) {
   for (let i = 0; i < Math.max(before.length, after.length); i++) {
    const p = `${path}/${i}`;
    if (i >= before.length) add({ kind: 'added', path: p, after: after[i] });
    else if (i >= after.length) add({ kind: 'removed', path: p, before: before[i] });
    else visit(before[i], after[i], p);
   }
  } else if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
   const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
   for (const key of keys) {
    const p = `${path}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`;
    if (!Object.hasOwn(before, key)) add({ kind: 'added', path: p, after: after[key] });
    else if (!Object.hasOwn(after, key)) add({ kind: 'removed', path: p, before: before[key] });
    else visit(before[key], after[key], p);
   }
  } else add({ kind: 'changed', path, before, after });
 }
 visit(a.value, b.value, '');
 const text = JSON.stringify({ equal: !changes.length, changes }, null, 2);
 if (byteSize(text) > OUTPUT_BYTES) throw new Error('output-limit');
 return { text, changes };
}
