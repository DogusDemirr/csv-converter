'use client';
import { useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import type { DeveloperId } from '@/lib/developer-tools/contracts';
import type { CSharpOptions } from '@/lib/developer-tools/csharp';
import { developerCopy } from '@/lib/developer-tool-copy';
import { useDeveloperJob } from '@/hooks/use-developer-job';
import { TextPanel } from './text-panel';
import {Phase52Workbench} from './phase52-workbench';
import {RegexWorkbench} from './regex-workbench';
const defaults:CSharpOptions={className:'Root',namespace:'Generated.Models',nullable:true,attributes:true};
export default function DeveloperWorkbench({id,locale}:{id:DeveloperId;locale:Locale}) {
 if(id==='regex-tester')return <RegexWorkbench locale={locale}/>;
 if(id==='json-to-typescript'||id==='sql-formatter')return <Phase52Workbench id={id} locale={locale}/>;
 return <PriorWorkbench id={id} locale={locale}/>;
}
function PriorWorkbench({id,locale}:{id:'json-diff'|'json-to-csharp';locale:Locale}) {
 const t=developerCopy[locale];const diff=id==='json-diff';
 const [left,setLeft]=useState('');const [right,setRight]=useState('');const [options,setOptions]=useState(defaults);const [status,setStatus]=useState('');
 const {result,error,busy,clear,run,url}=useDeveloperJob();const revision=useRef(0);
 function invalidate(){revision.current++;clear();setStatus('');}
 function reset(all=false){invalidate();setLeft('');setRight('');if(all)setOptions(defaults);}
 async function copy(){const version=revision.current;try{await navigator.clipboard.writeText(result?.text??'');if(version===revision.current)setStatus(t.copied);}catch{if(version===revision.current)setStatus(t.clipboard);}}
 function changeOptions(patch:Partial<CSharpOptions>){invalidate();setOptions({...options,...patch});}
 return <section className="workbench" aria-label={diff?t.compare:t.generate}><p className="notice">{t.limits}</p>
 {!diff && <div className="work-options"><label>{t.className}<input id="class-name" value={options.className} maxLength={80} onChange={e=>changeOptions({className:e.target.value})}/></label><label>{t.namespace}<input id="class-namespace" value={options.namespace} maxLength={200} onChange={e=>changeOptions({namespace:e.target.value})}/></label><label className="check-option"><input type="checkbox" checked={options.nullable} onChange={e=>changeOptions({nullable:e.target.checked})}/>{t.nullable}</label><label className="check-option"><input type="checkbox" checked={options.attributes} onChange={e=>changeOptions({attributes:e.target.checked})}/>{t.attributes}</label></div>}
 <div className="editor-grid"><TextPanel id="json-left" label={diff?t.left:t.input} value={left} maxLength={1048577} onChange={e=>{invalidate();setLeft(e.target.value);}}/>{diff?<TextPanel id="json-right" label={t.right} value={right} maxLength={1048577} onChange={e=>{invalidate();setRight(e.target.value);}}/>:<TextPanel id="developer-output" label={t.output} value={result?.text.slice(0,50000)??''} readOnly/>}</div>
 <div className="work-actions developer-actions"><button className="primary" disabled={busy} onClick={()=>{invalidate();run(diff?{id:'json-diff',left,right}:{id:'json-to-csharp',input:left,options});}}>{diff?t.compare:t.generate}</button>{diff&&<button className="secondary" onClick={()=>{invalidate();setLeft(right);setRight(left);}}>{t.swap}</button>}<button className="secondary" onClick={()=>reset()}>{t.clear}</button>{!diff&&<button className="secondary" onClick={()=>reset(true)}>{t.reset}</button>}<button className="secondary" disabled={!result} onClick={copy}>{t.copy}</button>{result&&url&&<a className="primary" href={url} download={`${id}.${result.extension}`}>{t.download} ↓</a>}</div>
 <p className="status" role="status">{busy?t.busy:status||(result?t.done:'')}</p>{error&&<p role="alert" className="error">{t.errors[error as keyof typeof t.errors]??t.errors['engine-error']}</p>}
 {result?.warnings.map(w=><p className="notice" key={w}>{t.warnings[w as keyof typeof t.warnings]}</p>)}
 {diff&&result&&<><h2 className="diff-heading">{result.changes?.length?`${result.changes.length} ${locale==='en'?'changes':'değişiklik'}`:t.equal}</h2><p className="sample">{t.more}</p><div className="diff-list">{result.changes?.slice(0,100).map((change,index)=><article className={`diff-entry diff-${change.kind}`} key={index}><h3><span>{t[change.kind]}</span> <code>{change.path?(change.path.length>200?change.path.slice(0,200)+'…':change.path):t.root}</code></h3><div className="diff-values"><div><strong>{t.before}</strong><pre>{Object.hasOwn(change,'before')?JSON.stringify(change.before,null,2).slice(0,2000):t.missing}</pre></div><div><strong>{t.after}</strong><pre>{Object.hasOwn(change,'after')?JSON.stringify(change.after,null,2).slice(0,2000):t.missing}</pre></div></div></article>)}</div><div className="editor-grid"><TextPanel id="developer-output" label={t.output} value={result.text.slice(0,50000)} readOnly/></div></>}
 <p className="sample">{t.preview}</p><p className="notice">{t.common}</p></section>;
}
