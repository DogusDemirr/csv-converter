import { byteSize, OUTPUT_BYTES, parseJson, type Json } from './json';
export type TypeScriptOptions = { rootName:string; kind:'interface'|'type'; optional:'missing'|'all'|'required'; nulls:'preserve'|'unknown' };
const reserved=new Set('break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with as implements interface let package private protected public static yield any boolean constructor declare get module require number set string symbol type from of keyof readonly never unknown object namespace abstract async await infer is asserts unique global undefined intrinsic override bigint accessor assert out satisfies using defer'.split(' '));
function literal(s:string){return JSON.stringify(s).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));}
function property(s:string){return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s)&&!reserved.has(s)?s:literal(s);}
const object=(v:Json):v is {[key:string]:Json}=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function jsonToTypeScript(input:string,options:TypeScriptOptions){
 if(!/^[A-Za-z_$][A-Za-z0-9_$]{0,79}$/.test(options.rootName)||reserved.has(options.rootName))throw new Error('invalid-type-name');
 if(!['interface','type'].includes(options.kind)||!['missing','all','required'].includes(options.optional)||!['preserve','unknown'].includes(options.nulls))throw new Error('invalid-request');
 const {value}=parseJson(input);const names=new Set<string>();const models:{name:string;fields:string[]}[]=[];const warnings=new Set<string>();let fields=0;
 function unique(hint:string){let base=hint.normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i').match(/[A-Za-z0-9]+/g)?.map(s=>s[0].toUpperCase()+s.slice(1)).join('').slice(0,70)||'Model';if(/^[0-9]/.test(base)||reserved.has(base))base='Model'+base;let name=base;let n=2;while(names.has(name))name=base+n++;names.add(name);return name;}
 function union(types:string[]){const unique=[...new Set(types)];if(unique.includes('unknown'))return 'unknown';return unique.sort().join(' | ');}
 function infer(samples:Json[],hint:string):string{
  const types:string[]=[];const objects=samples.filter(object);if(objects.length)types.push(model(objects,hint));
  const arrays=samples.filter(Array.isArray) as Json[][];if(arrays.length){const elements=arrays.flat();const child=elements.length?infer(elements,hint+'Item'):'unknown';if(!elements.length)warnings.add('ts-empty-array');types.push(child.includes(' | ')?`(${child})[]`:`${child}[]`);}
  for(const v of samples){if(v===null){types.push(options.nulls==='preserve'?'null':'unknown');if(options.nulls==='unknown')warnings.add('ts-unknown-null');}else if(typeof v!=='object')types.push(typeof v);}
  return union(types)||'unknown';
 }
 function model(samples:{[key:string]:Json}[],hint:string,root=false){
  if(models.length>=200)throw new Error('model-limit');
  const name=root?options.rootName:unique(hint);if(root)names.add(name);
  const entry={name,fields:[] as string[]};models.push(entry);
  const keys=[...new Set(samples.flatMap(s=>Object.keys(s)))].sort();
  for(const key of keys){if(++fields>5000)throw new Error('model-limit');const values=samples.filter(s=>Object.hasOwn(s,key)).map(s=>s[key]);const optional=options.optional==='all'||(options.optional==='missing'&&values.length<samples.length);entry.fields.push(`  ${property(key)}${optional?'?':''}: ${infer(values,key)};`);}
  return name;
 }
 const samples=Array.isArray(value)&&value.length&&value.every(object)?value:[value];
 let rootType:string|undefined;
 if(samples.every(object))model(samples,options.rootName,true);
 else {if(options.kind==='interface')throw new Error('ts-interface-root');names.add(options.rootName);rootType=infer([value],'Value');}
 const lines=['// Inferred from sample JSON. Review before use.'];let bytes=byteSize(lines[0]);
 function emit(s:string){bytes+=byteSize(s)+1;if(bytes>OUTPUT_BYTES)throw new Error('output-limit');lines.push(s);}
 if(rootType)emit(`export type ${options.rootName} = ${rootType};`);
 for(const m of models){emit('');emit(`export ${options.kind==='interface'?'interface':'type'} ${m.name}${options.kind==='type'?' =':''} {`);for(const field of m.fields)emit(field);emit(options.kind==='type'?'};':'}');}
 if(options.optional==='required')warnings.add('ts-required');
 return {text:lines.join('\n'),warnings:[...warnings]};
}
