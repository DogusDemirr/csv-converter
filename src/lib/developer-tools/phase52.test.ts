import {describe,expect,it} from 'vitest';
import ts from 'typescript';
import {jsonToTypeScript,type TypeScriptOptions} from './typescript';
import {formatSql,verifySqlPreservation,type SqlOptions} from './sql';
import {sqlTokens} from './sql-lex';
import {highlight} from './highlight';
import {validateRequest} from './contracts';
const options:TypeScriptOptions={rootName:'Root',kind:'interface',optional:'missing',nulls:'preserve'};
const sqlOptions:SqlOptions={dialect:'transactsql',keywordCase:'upper',indent:2};
describe('JSON to TypeScript',()=>{
 it('infers nested objects, arrays, nullable unions and optional fields',()=>{const code=jsonToTypeScript('[{"name":"İzmir","values":[1,"x",null],"address":{"city":"Ada"}},{"name":null,"address":{"city":"Çağrı","zip":1}}]',options).text;expect(code).toContain('name: null | string');expect(code).toContain('values?: (null | number | string)[]');expect(code).toContain('export interface Address');expect(code).toContain('zip?: number');});
 it('quotes Unicode, reserved and invalid property identifiers',()=>{const code=jsonToTypeScript('{"Çağrı 🌍":1,"foo-bar":true,"class":"x","x\\\"; injected":null}',options).text;expect(code).toContain('"\\u00c7a\\u011fr\\u0131 \\ud83c\\udf0d": number');expect(code).toContain('"foo-bar": boolean');expect(code).toContain('"class": string');expect(code).toContain('\\"; injected');});
 it('handles empty arrays, null-only, missing and custom options',()=>{const result=jsonToTypeScript('[{"list":[],"only":null},{"list":[]}]',{...options,kind:'type',optional:'all',nulls:'unknown',rootName:'ApiResponse'});expect(result.text).toContain('export type ApiResponse = {');expect(result.text).toContain('list?: unknown[]');expect(result.text).toContain('only?: unknown');expect(result.warnings).toEqual(expect.arrayContaining(['ts-empty-array','ts-unknown-null']));});
 it('supports primitive and heterogeneous array roots in type mode',()=>{expect(jsonToTypeScript('[1,"x",true,null]',{...options,kind:'type'}).text).toContain('(boolean | null | number | string)[]');expect(jsonToTypeScript('null',{...options,kind:'type'}).text).toContain('Root = null;');expect(()=>jsonToTypeScript('[1]',options)).toThrow('ts-interface-root');});
 it('retains quoted prototype names and resolves nested name collisions',()=>{const code=jsonToTypeScript('{"foo-bar":{"x":1},"foo_bar":{"x":2},"__proto__":{"safe":true}}',options).text;expect(code).toContain('FooBar2');expect(({} as Record<string,unknown>).safe).toBeUndefined();});
 it.each(['class','type','foo-bar','1Root','A;export const x=1'])('rejects invalid root names %s',rootName=>expect(()=>jsonToTypeScript('{}',{...options,rootName})).toThrow('invalid-type-name'));
 it('protects every keyword in the installed TypeScript compiler',()=>{for(let kind=ts.SyntaxKind.FirstKeyword;kind<=ts.SyntaxKind.LastKeyword;kind++){const rootName=ts.tokenToString(kind);if(rootName)expect(()=>jsonToTypeScript('{}',{...options,rootName}),rootName).toThrow('invalid-type-name');}});
 it.each(['','bad','{"a":}'])('rejects empty or malformed JSON %s',text=>expect(()=>jsonToTypeScript(text,options)).toThrow());
 it('enforces bytes, depth, numeric and type/property budgets',()=>{expect(()=>jsonToTypeScript('"'+'x'.repeat(1048576)+'"',options)).toThrow('input-limit');expect(()=>jsonToTypeScript('['.repeat(51)+'0'+']'.repeat(51),options)).toThrow('structure-limit');expect(()=>jsonToTypeScript('{"id":9007199254740993}',options)).toThrow('unsafe-number');expect(()=>jsonToTypeScript(JSON.stringify(Object.fromEntries(Array.from({length:5001},(_,i)=>['a'+i,1]))),options)).toThrow('model-limit');});
 it('bounds nested model count and quoted-key output expansion',()=>{expect(()=>jsonToTypeScript(JSON.stringify(Object.fromEntries(Array.from({length:200},(_,i)=>['k'+i,{}]))),options)).toThrow('model-limit');expect(()=>jsonToTypeScript(JSON.stringify({['İ'.repeat(180000)]:1}),options)).toThrow('output-limit');});
 it('type-checks generated code using the real strict TypeScript compiler',()=>{
  const inputs=[{text:'{"user":{"name":"Ada"},"list":[{"x":1},{"x":null}],"🌍":null}'},{text:'[{"a":1},{"b":true}]'},{text:'{"foo-bar":{"x":1},"foo_bar":{"x":2},"constructor":{},"x\\\"; export const bad = 1; //":1}'},{text:'[1,"x",null,{},[true]]',kind:'type' as const},{text:'{"nil":null,"empty":[]}',nulls:'unknown' as const},{text:'[{"x":1},{}]',optional:'required' as const}];
  const files=new Map(inputs.map((f,i)=>[`/generated/case${i}.ts`,jsonToTypeScript(f.text,{...options,...f}).text]));
  const compilerOptions:ts.CompilerOptions={strict:true,noEmit:true,exactOptionalPropertyTypes:true,types:[],lib:['lib.es2022.d.ts']};const host=ts.createCompilerHost(compilerOptions);const original=host.getSourceFile.bind(host);
  host.getSourceFile=(file,language,...rest)=>files.has(file)?ts.createSourceFile(file,files.get(file)!,language,true):original(file,language,...rest);
  const program=ts.createProgram([...files.keys()],compilerOptions,host);expect(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n'))).toEqual([]);
 });
});
describe('SQL formatter safety',()=>{
 it('formats T-SQL string literals, parameters, comments and bracket identifiers without changing them',async()=>{
  const source="select [First Name], [a]]b], N'Çağrı ''SQL'' 🌍' as [literal] from [dbo].[Users] -- keep Case @Param\nwhere [Id]=@UserId and [Status]='Do NOT CHANGE'; /* Keep THIS */";
  const result=await formatSql(source,sqlOptions);expect(result.text).toContain('SELECT');expect(result.text).toContain("N'Çağrı ''SQL'' 🌍'");expect(result.text).toContain('@UserId');expect(result.text).toContain('-- keep Case @Param');expect(result.text).toContain('/* Keep THIS */');expect(result.text).toContain('[a]]b]');
  const protectedTokens=(text:string)=>sqlTokens(text).filter(t=>['literal','identifier','parameter','comment'].includes(t.kind)).map(t=>t.text);expect(protectedTokens(result.text)).toEqual(protectedTokens(source));
 });
 it('formats a T-SQL CTE and supports keyword case and indentation',async()=>{
  const source='with cte as (select [Id], @Param as [Value] from [dbo].[Users] where [Id] > 0) select [Id] from cte;';
  const upper=await formatSql(source,{...sqlOptions,indent:4});expect(upper.text).toContain('WITH');expect(upper.text).toMatch(/\n {4}/);const lower=await formatSql(source,{...sqlOptions,keywordCase:'lower'});expect(lower.text).toContain('select');expect(lower.text).toContain('@Param');
 });
 it('formats general SQL with quoted identifiers, escaped strings and named parameters',async()=>{const result=await formatSql('select "User Name", \'it\'\'s Safe\' from users where id = :UserId',{...sqlOptions,dialect:'sql'});expect(result.text).toContain('"User Name"');expect(result.text).toContain(":UserId");expect(result.text).toContain("'it''s Safe'");});
 it.each(['CREATE PROCEDURE dbo.p @Id int AS BEGIN SELECT @Id; END;','CREATE OR ALTER PROC [dbo].[P] AS SELECT 1;','ALTER PROCEDURE dbo.P AS SELECT 1;','CREATE FUNCTION dbo.f() RETURNS int AS BEGIN RETURN 1 END;','DECLARE @p int; SELECT @p;'])('explicitly rejects unsupported procedural SQL',async text=>{await expect(formatSql(text,sqlOptions)).rejects.toThrow('sql-unsupported');});
 it.each(['SELECT 1;\nGO\nSELECT 2;','select 1\nGO 2 -- repeat'])('rejects GO batches safely',async text=>{await expect(formatSql(text,sqlOptions)).rejects.toThrow('sql-batch');});
 it('does not treat GO inside literals, comments or brackets as a separator',async()=>{const result=await formatSql("select 'GO', [GO] -- GO\nfrom [table]",sqlOptions);expect(result.text).toContain("'GO'");expect(result.text).toContain('[GO]');});
 it.each(["select 'oops",'select [oops','select /*oops'])('rejects unterminated protected tokens',async text=>{await expect(formatSql(text,sqlOptions)).rejects.toThrow('sql-invalid');});
 it('rejects unsupported formatter directives and options',async()=>{await expect(formatSql('/* sql-formatter-disable */ SELECT 1',sqlOptions)).rejects.toThrow('sql-unsupported');await expect(formatSql('select 1',{...sqlOptions,dialect:'mysql' as 'sql'})).rejects.toThrow('invalid-request');});
 it('checks token identity and order as a fail-closed postcondition',()=>{
  for(const [a,b]of [["select 'Case'","SELECT 'case'"],['select @UserId','SELECT @userid'],['select [Id]','SELECT [ID]'],['select a,b','SELECT b,a'],['select 1 -- keep\nfrom t','SELECT 1 -- keep from t']])expect(()=>verifySqlPreservation(sqlTokens(a),sqlTokens(b),'upper')).toThrow('sql-preservation');
 });
 it('bounds bytes, lines and empty input',async()=>{await expect(formatSql('',sqlOptions)).rejects.toThrow('empty-input');await expect(formatSql('x'.repeat(262145),sqlOptions)).rejects.toThrow('sql-limit');await expect(formatSql('\n'.repeat(10001)+'select 1',sqlOptions)).rejects.toThrow('sql-limit');});
 it('bounds nesting and tokens before calling the formatter',async()=>{await expect(formatSql('select '+ '('.repeat(101)+'1'+')'.repeat(101),sqlOptions)).rejects.toThrow('sql-limit');await expect(formatSql('x '.repeat(50001),sqlOptions)).rejects.toThrow('sql-limit');await expect(formatSql('select (1',sqlOptions)).rejects.toThrow('sql-invalid');});
 it('preserves case when requested and leaves malicious HTML as literal data',async()=>{const r=await formatSql("SeLeCt '<img src=x onerror=alert(1)>' as [X]",{...sqlOptions,keywordCase:'preserve'});expect(r.text).toContain('SeLeCt');expect(r.text).toContain("'<img src=x onerror=alert(1)>'");});
});
it('rejects unvalidated new worker options and exposes no minify action',()=>{expect(()=>validateRequest({version:1,requestId:1,id:'sql-minify',input:'select 1',options:{}})).toThrow('invalid-request');expect(()=>validateRequest({version:1,requestId:1,id:'json-to-typescript',input:'{}',options:{}})).toThrow('invalid-request');expect(()=>validateRequest({version:1,requestId:1,id:'sql-formatter',input:'select 1',options:{dialect:'sql',keywordCase:'upper',indent:3}})).toThrow('invalid-request');});
it('syntax highlighting preserves text and is bounded',()=>{const source='SELECT \'<script>alert(1)</script>\', [X] -- comment\nFROM t;';const tokens=highlight(source);expect(tokens.map(t=>t.text).join('')).toBe(source);expect(tokens.some(t=>t.kind==='keyword')).toBe(true);expect(highlight('x'.repeat(60000)).map(t=>t.text).join('')).toHaveLength(50000);});
