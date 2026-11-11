import { describe, expect, it } from 'vitest';
import { jsonDiff } from './json-diff';
import { jsonToCsharp, csharpLiteral, type CSharpOptions } from './csharp';
import { parseJson } from './json';
import { validateRequest } from './contracts';
const opts:CSharpOptions={className:'Root',namespace:'App.Models',nullable:true,attributes:true};
describe('JSON Diff',()=>{
 it('ignores object order recursively',()=>expect(jsonDiff('{"a":{"x":1,"y":2},"b":false}','{"b":false,"a":{"y":2,"x":1}}').changes).toEqual([]));
 it('reports added, removed and changed paths including arrays',()=>{
  expect(jsonDiff('{"a":1,"gone":true,"items":[1,2]}','{"a":2,"new":null,"items":[2,1,3]}').changes).toEqual([
   {kind:'changed',path:'/a',before:1,after:2},{kind:'removed',path:'/gone',before:true},{kind:'changed',path:'/items/0',before:1,after:2},{kind:'changed',path:'/items/1',before:2,after:1},{kind:'added',path:'/items/2',after:3},{kind:'added',path:'/new',after:null}]);
 });
 it('escapes pointers and handles prototype names as data',()=>{const changes=jsonDiff('{"a/b~c":0,"__proto__":1}','{"a/b~c":false,"__proto__":2}').changes;expect(changes.map(c=>c.path)).toEqual(['/__proto__','/a~1b~0c']);expect(({} as Record<string,unknown>).polluted).toBeUndefined();});
 it.each([[null,false],[false,0],[0,''],['',null]])('distinguishes %s and %s',(a,b)=>expect(jsonDiff(JSON.stringify(a),JSON.stringify(b)).changes).toEqual([{kind:'changed',path:'',before:a,after:b}]));
 it('distinguishes missing from null and removes an array tail',()=>{expect(jsonDiff('{}','{"x":null}').changes[0]).toEqual({kind:'added',path:'/x',after:null});expect(jsonDiff('[0,false]','[0]').changes[0]).toEqual({kind:'removed',path:'/1',before:false});});
 it('preserves Unicode and inert HTML',()=>expect(jsonDiff('"Çağrı 🌍"','"<img src=x onerror=alert(1)>"').changes[0].after).toContain('<img'));
 it.each([['','{}','empty-left'],['{}','','empty-right'],['bad','{}','invalid-left'],['{}','bad','invalid-right']])('rejects invalid inputs', (a,b,code)=>expect(()=>jsonDiff(a,b)).toThrow(code));
 it('limits total bytes, nodes and difference count',()=>{
  expect(()=>jsonDiff('"'+'a'.repeat(600000)+'"','"'+'b'.repeat(600000)+'"')).toThrow('input-limit');
  expect(()=>jsonDiff(JSON.stringify(Array(25000).fill(0)),JSON.stringify(Array(25000).fill(0)))).toThrow('structure-limit');
  expect(()=>jsonDiff(JSON.stringify(Array(2001).fill(0)),JSON.stringify(Array(2001).fill(1)))).toThrow('output-limit');
 });
 it('bounds repeated path amplification',()=>{const key='p'.repeat(3000);const left={[key]:Object.fromEntries(Array.from({length:500},(_,i)=>['k'+i,0]))};const right={[key]:Object.fromEntries(Array.from({length:500},(_,i)=>['k'+i,1]))};expect(()=>jsonDiff(JSON.stringify(left),JSON.stringify(right))).toThrow('output-limit');});
});
describe('bounded JSON',()=>{
 it('rejects deep inputs and unsafe numbers',()=>{expect(()=>parseJson('['.repeat(51)+'0'+']'.repeat(51))).toThrow('structure-limit');expect(()=>parseJson('9007199254740993')).toThrow('unsafe-number');expect(()=>parseJson('1e400')).toThrow('unsafe-number');});
 it('rejects object graphs at the message boundary instead of traversing cycles',()=>{const cycle:Record<string,unknown>={};cycle.self=cycle;expect(()=>validateRequest({version:1,requestId:1,id:'json-diff',left:cycle,right:'{}'})).toThrow('invalid-request');});
 it('treats reference-like keys as ordinary data',()=>expect(parseJson('{"$ref":"#","self":null}').value).toEqual({$ref:'#',self:null}));
});
describe('JSON to C#',()=>{
 it('generates nested classes, list elements and numeric types',()=>{
  const result=jsonToCsharp('{"name":"Ada","ok":true,"count":1,"big":2147483648,"price":1.5,"address":{"city":"İzmir"},"items":[{"id":1},{"id":2,"extra":false}]}',opts);
  expect(result.text).toContain('public string Name');expect(result.text).toContain('public bool Ok');expect(result.text).toContain('public int Count');expect(result.text).toContain('public long Big');expect(result.text).toContain('public double Price');expect(result.text).toContain('List<ItemsItem> Items');expect(result.text).toContain('public bool? Extra');expect(result.text).toContain('public class Address');expect(result.warnings).toContain('floating-point');
 });
 it('merges all object samples and makes missing and null fields nullable',()=>{
  const text=jsonToCsharp('[{"x":"yes","n":null},{"other":0,"x":null}]',opts).text;expect(text).toContain('string? X');expect(text).toContain('int? Other');expect(text).toContain('JsonElement? N');
 });
 it('supports list nullability and numeric promotion',()=>{const text=jsonToCsharp('{"list":[1,null,2147483648],"grid":[[true],[false]]}',opts).text;expect(text).toContain('List<long?> List');expect(text).toContain('List<global::System.Collections.Generic.List<bool>> Grid');});
 it('warns for empty arrays, null-only and mixed types',()=>{const r=jsonToCsharp('{"empty":[],"nil":null,"mixed":[1,"x"],"maybe":[{"a":1},false]}',opts);expect(r.warnings.sort()).toEqual(['empty-array','mixed-types','unknown-null']);expect(r.text).toContain('List<global::System.Text.Json.JsonElement>');});
 it('resolves naming collisions and reserved C# words',()=>{
  const r=jsonToCsharp('{"foo-bar":{"x":1},"foo_bar":{"x":2},"123":true,"Root":{},"🌍":{},"class":1}',{...opts,className:'class',namespace:'App.namespace'});
  expect(r.text).toContain('class @class');expect(r.text).toContain('namespace App.@namespace');expect(r.text).toContain('FooBar2');expect(r.text).toContain('Value123');expect(r.text).toContain('Property');
 });
 it('escapes injection keys and Unicode string literals',()=>{expect(csharpLiteral('"\\\nİ🌍\u2028')).toBe('"\\"\\\\\\u000a\\u0130\\ud83c\\udf0d\\u2028"');const code=jsonToCsharp('{"x\\\" ); public class Pwn {} //":1}',opts).text;expect(code).toContain('JsonPropertyName(');expect(code).not.toContain('\npublic class Pwn');});
 it('honors namespace, attributes and nullable options',()=>{const r=jsonToCsharp('[{"a":"x"},{"a":null}]',{...opts,namespace:'',attributes:false,nullable:false});expect(r.text).toContain('#nullable disable');expect(r.text).not.toContain('string?');expect(r.text).not.toContain('JsonPropertyName(');expect(r.text).not.toContain('namespace ');expect(r.warnings).toContain('attributes-off');});
 it.each(['[]','null','false','1','"hello"','[{},null]','[1]'])('rejects unsupported roots %s',s=>expect(()=>jsonToCsharp(s,opts)).toThrow('invalid-root'));
 it.each(['','not json'])('rejects empty or invalid JSON',s=>expect(()=>jsonToCsharp(s,opts)).toThrow());
 it.each(['bad-name','class X {}','System','A\nB'])('rejects injected class names %s',className=>expect(()=>jsonToCsharp('{}',{...opts,className})).toThrow('invalid-name'));
 it.each(['A;using X','System.Models','Microsoft.X','App..Models'])('rejects invalid namespaces %s',namespace=>expect(()=>jsonToCsharp('{}',{...opts,namespace})).toThrow('invalid-name'));
 it('limits input size, depth, classes and properties',()=>{
  expect(()=>jsonToCsharp('"'+'x'.repeat(1048576)+'"',opts)).toThrow('input-limit');expect(()=>jsonToCsharp('['.repeat(51)+'0'+']'.repeat(51),opts)).toThrow('structure-limit');
  expect(()=>jsonToCsharp(JSON.stringify(Object.fromEntries(Array.from({length:200},(_,i)=>['k'+i,{}]))),opts)).toThrow('model-limit');
  expect(()=>jsonToCsharp(JSON.stringify(Object.fromEntries(Array.from({length:5001},(_,i)=>['k'+i,1]))),opts)).toThrow('model-limit');
 });
 it('bounds attribute literal output amplification',()=>expect(()=>jsonToCsharp(JSON.stringify({['İ'.repeat(180000)]:1}),opts)).toThrow('output-limit'));
});
it('rejects malformed worker contracts and unknown tools',()=>{for(const value of [null,{}, {version:1,requestId:1,id:'excel-to-json'}, {version:1,requestId:1,id:'json-diff',left:1,right:'{}'},{version:1,requestId:1,id:'json-to-csharp',input:'{}',options:{}}])expect(()=>validateRequest(value)).toThrow('invalid-request');expect(()=>validateRequest({version:1,requestId:1,id:'json-diff',left:'{}',right:'{}'})).not.toThrow();});
