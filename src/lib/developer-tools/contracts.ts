import type { CSharpOptions } from './csharp';
import type { Difference } from './json-diff';
import type {TypeScriptOptions} from './typescript';
import type {SqlOptions} from './sql';
import type {RegexReport} from './regex';
export type DeveloperId = 'json-diff' | 'json-to-csharp' | 'json-to-typescript' | 'sql-formatter' | 'regex-tester';
export const isDeveloperId = (id: string): id is DeveloperId => ['json-diff','json-to-csharp','json-to-typescript','sql-formatter','regex-tester'].includes(id);
export type Request = { version: 1; requestId: number } & ({ id: 'json-diff'; left: string; right: string } | { id: 'json-to-csharp'; input: string; options: CSharpOptions } | {id:'json-to-typescript';input:string;options:TypeScriptOptions} | {id:'sql-formatter';input:string;options:SqlOptions} | {id:'regex-tester';operation:'capabilities'} | {id:'regex-tester';operation:'test';pattern:string;input:string;flags:string});
export type Result = { text: string; extension: 'json' | 'cs' | 'ts' | 'sql'; changes?: Difference[]; warnings: string[]; regex?:RegexReport; supportedFlags?:string[] };
export type Response = { version: 1; requestId: number } & ({ result: Result; error?: never } | { error: string; result?: never });
export function validateRequest(value: unknown): asserts value is Request {
 if (!value || typeof value !== 'object') throw new Error('invalid-request');
 const v = value as Record<string, unknown>;
 if (v.version !== 1 || !Number.isSafeInteger(v.requestId) || (v.requestId as number) < 1) throw new Error('invalid-request');
 if (v.id === 'json-diff' && typeof v.left === 'string' && typeof v.right === 'string') return;
 if(v.id==='regex-tester'&&(v.operation==='capabilities'||(v.operation==='test'&&typeof v.pattern==='string'&&typeof v.input==='string'&&typeof v.flags==='string')))return;
 if (v.id === 'json-to-csharp' && typeof v.input === 'string' && v.options && typeof v.options === 'object') {
  const o = v.options as Record<string,unknown>;
  if (typeof o.className === 'string' && typeof o.namespace === 'string' && typeof o.nullable === 'boolean' && typeof o.attributes === 'boolean') return;
 }
 if(typeof v.input==='string'&&v.options&&typeof v.options==='object'){
  const o=v.options as Record<string,unknown>;
  if(v.id==='json-to-typescript'&&typeof o.rootName==='string'&&(o.kind==='interface'||o.kind==='type')&&(o.optional==='missing'||o.optional==='all'||o.optional==='required')&&(o.nulls==='preserve'||o.nulls==='unknown'))return;
  if(v.id==='sql-formatter'&&(o.dialect==='sql'||o.dialect==='transactsql')&&(o.keywordCase==='upper'||o.keywordCase==='lower'||o.keywordCase==='preserve')&&(o.indent===2||o.indent===4))return;
 }
 throw new Error('invalid-request');
}
