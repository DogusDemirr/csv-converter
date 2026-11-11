import { byteSize, OUTPUT_BYTES, parseJson, type Json } from './json';
export type CSharpOptions = { className: string; namespace: string; nullable: boolean; attributes: boolean };
const keywords = new Set(('abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while record required file scoped init global var dynamic value partial async await yield').split(' '));
const identifier = (name: string) => /^[A-Za-z_][A-Za-z0-9_]{0,79}$/.test(name);
const escapeId = (name: string) => keywords.has(name) ? `@${name}` : name;
export function csharpLiteral(text: string) {
 // ASCII-only literals also escape bidi, surrogate pairs and line separators safely.
 return '"' + [...text].map(char => {
  if (char === '"') return '\\"'; if (char === '\\') return '\\\\';
  const code = char.codePointAt(0)!;
  if (code >= 32 && code <= 126) return char;
  if (code > 65535) { const n = code - 65536; return `\\u${(0xd800 + (n >> 10)).toString(16).padStart(4,'0')}\\u${(0xdc00 + (n & 1023)).toString(16).padStart(4,'0')}`; }
  return `\\u${code.toString(16).padStart(4,'0')}`;
 }).join('') + '"';
}
function pascal(name: string) {
 const words = name.normalize('NFKD').replace(/\p{M}/gu, '').replace(/ı/g,'i').match(/[A-Za-z0-9]+/g) ?? [];
 let value = words.map(word => word[0].toUpperCase() + word.slice(1)).join('').slice(0,70) || 'Property';
 if (/^[0-9]/.test(value)) value = 'Value' + value;
 return value;
}
type Field = { name: string; original: string; type: string; reference: boolean };
type Model = { name: string; fields: Field[] };
const object = (v: Json): v is { [key: string]: Json } => v !== null && typeof v === 'object' && !Array.isArray(v);
export function jsonToCsharp(input: string, options: CSharpOptions) {
 if (!identifier(options.className) || options.className === 'System' || options.namespace.length > 200 || (options.namespace && (!options.namespace.split('.').every(identifier) || /^(System|Microsoft)(\.|$)/.test(options.namespace)))) throw new Error('invalid-name');
 const { value } = parseJson(input);
 const roots = Array.isArray(value) ? value : [value];
 if (!roots.length || !roots.every(object)) throw new Error('invalid-root');
 const models: Model[] = []; const names = new Set<string>(['System']); const warnings = new Set<string>(); let properties = 0;
 function unique(base: string, used: Set<string>) { let name = base; let suffix = 2; while (used.has(name)) name = `${base}${suffix++}`; used.add(name); return name; }
 function infer(samples: Json[], hint: string, missing = false): { type: string; reference: boolean } {
  const nullable = missing || samples.some(v => v === null);
  const nonnull = samples.filter(v => v !== null);
  const kinds = new Set(nonnull.map(v => Array.isArray(v) ? 'array' : typeof v));
  let type: string; let reference = false;
  if (!nonnull.length) { type = 'global::System.Text.Json.JsonElement'; warnings.add('unknown-null'); }
  else if (kinds.size > 1) { type = 'global::System.Text.Json.JsonElement'; warnings.add('mixed-types'); }
  else if (kinds.has('string')) { type = 'string'; reference = true; }
  else if (kinds.has('boolean')) type = 'bool';
  else if (kinds.has('number')) {
   const numbers = nonnull as number[];
   if (numbers.some(n => !Number.isInteger(n))) { type = 'double'; warnings.add('floating-point'); }
   else type = numbers.every(n => n >= -2147483648 && n <= 2147483647) ? 'int' : 'long';
  } else if (kinds.has('object')) { type = model(nonnull as { [key: string]: Json }[], hint); reference = true; }
  else {
   const elements = (nonnull as Json[][]).flat();
   const child = elements.length ? infer(elements, hint + 'Item') : { type: 'global::System.Text.Json.JsonElement', reference: false };
   if (!elements.length) warnings.add('empty-array');
   type = `global::System.Collections.Generic.List<${child.type}>`; reference = true;
  }
  if (nullable && (!reference || options.nullable)) type += '?';
  return { type, reference };
 }
 function model(samples: { [key: string]: Json }[], hint: string, root = false): string {
  if (models.length >= 200) throw new Error('model-limit');
  const rawName = unique(root ? hint : pascal(hint), names); const name = escapeId(rawName);
  const entry: Model = { name, fields: [] }; models.push(entry);
  const used = new Set([rawName,'Equals','GetType','GetHashCode','ToString','MemberwiseClone','Finalize']);
  const keys = [...new Set(samples.flatMap(s => Object.keys(s)))].sort();
  for (const key of keys) {
   if (++properties > 5000) throw new Error('model-limit');
   const values = samples.filter(s => Object.hasOwn(s,key)).map(s => s[key]);
   const prop = unique(pascal(key), used);
   const inferred = infer(values, prop, values.length !== samples.length);
   entry.fields.push({ name: escapeId(prop), original: key, ...inferred });
  }
  return name;
 }
 model(roots as { [key: string]: Json }[], options.className, true);
 if (!options.attributes) warnings.add('attributes-off');
 const lines: string[] = []; let bytes = 0;
 function emit(line = '') { bytes += byteSize(line) + 1; if (bytes > OUTPUT_BYTES) throw new Error('output-limit'); lines.push(line); }
 emit('// Generated from sample JSON. Review inferred types before use.');
 emit(options.nullable ? '#nullable enable' : '#nullable disable'); emit();
 const space = options.namespace ? '    ' : '';
 if (options.namespace) { emit(`namespace ${options.namespace.split('.').map(escapeId).join('.')}`); emit('{'); }
 for (const entry of models) {
  emit(`${space}public class ${entry.name}`); emit(`${space}{`);
  for (const field of entry.fields) {
   if (options.attributes) emit(`${space}    [global::System.Text.Json.Serialization.JsonPropertyName(${csharpLiteral(field.original)})]`);
   emit(`${space}    public ${field.type} ${field.name} { get; set; }${options.nullable && field.reference && !field.type.endsWith('?') ? ' = default!;' : ''}`); emit();
  }
  emit(`${space}}`); emit();
 }
 if (options.namespace) emit('}');
 return { text: lines.join('\n'), warnings: [...warnings] };
}
