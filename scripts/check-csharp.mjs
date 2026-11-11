import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const out=resolve('artifacts/csharp');await mkdir(out,{recursive:true});
for(const name of ['json','csharp']) {
 const source=(await readFile(`src/lib/developer-tools/${name}.ts`,'utf8')).replace("from './json'","from './json.mjs'");
 await writeFile(join(out,`${name}.mjs`),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
}
const {jsonToCsharp}=await import(pathToFileURL(join(out,'csharp.mjs')).href);
const fixtures=[
 {data:{name:'Çağrı 🌍',ok:true,count:42,big:2147483648,price:1.25,address:{city:'İzmir'},items:[{id:1},{id:2,extra:null}],grid:[[true],[false]]}},
 {data:[{name:'yes',missing:'x'},{name:null,n:0}]},
 {data:{'foo-bar':{},foo_bar:{},'123':true,'🌍':{},'" ); public class Pwn {} //':1,'a\n\u2028':null,'Root':{}},className:'class'},
 {data:{empty:[],nil:null,mixed:[1,'x',false],nullable:[null,1]},nullable:false,attributes:false},
 {data:{empty:[],nil:null,mixed:[1,'x',false],nullable:[null,1]}},
 {data:{a:1},className:'JsonElement'},
 {data:{a:1},namespace:'',className:'GlobalRoot'},
 {data:{a:1},namespace:'Test.namespace',className:'record'},
];
const files=[];
for(const [i,fixture] of fixtures.entries()){
 const result=jsonToCsharp(JSON.stringify(fixture.data),{className:fixture.className??'Root',namespace:fixture.namespace??`Generated.Case${i}`,nullable:fixture.nullable??true,attributes:fixture.attributes??true});
 const file=join(out,`Case${i}.cs`);await writeFile(file,result.text);files.push(file);
}
const root=process.env.DOTNET_ROOT??join(process.env.ProgramFiles??'C:/Program Files','dotnet');
const newest=entries=>entries.filter(s=>/^\d+\.\d+\.\d+$/.test(s)).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}))[0];
const sdk=newest(await readdir(join(root,'sdk')));const packs=await readdir(join(root,'packs/Microsoft.NETCore.App.Ref'));const ref=newest(packs.filter(s=>s.startsWith('8.')))??newest(packs);
if(!sdk||!ref)throw new Error('Installed .NET SDK/reference pack required.');
const tfm=(await readdir(join(root,'packs/Microsoft.NETCore.App.Ref',ref,'ref'))).find(s=>/^net\d/.test(s));
const refs=join(root,'packs/Microsoft.NETCore.App.Ref',ref,'ref',tfm);
const response=join(out,'compile.rsp');
await writeFile(response,['-nologo','-target:library','-langversion:8','-warnaserror+','-nowarn:CS8981',`-out:"${join(out,'GeneratedModels.dll')}"`,...(await readdir(refs)).filter(s=>s.endsWith('.dll')).map(s=>`-reference:"${join(refs,s)}"`),...files.map(s=>`"${s}"`)].join('\n'));
const compiled=spawnSync(join(root,'dotnet.exe'),[join(root,'sdk',sdk,'Roslyn/bincore/csc.dll'),`@${response}`],{encoding:'utf8',windowsHide:true,timeout:30000});
const summary={fixtures:files.length,sdk,referencePack:ref,language:'C# 8',exitCode:compiled.status,diagnostics:(compiled.stdout??'')+(compiled.stderr??''),note:'CS8981 (escaped lowercase user class names) is intentionally excluded; other warnings are errors. Compilation only, no generated code execution.'};
await writeFile(join(out,'result.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
if(compiled.error)throw compiled.error;if(compiled.status!==0)process.exitCode=1;
