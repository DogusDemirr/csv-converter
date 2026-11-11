'use client';
import {useRef,useState} from 'react';
import type {Locale} from '@/lib/i18n';
import {regexCopy} from '@/lib/regex-copy';
import type {RegexMatch} from '@/lib/developer-tools/regex';
import {useDeveloperJob} from '@/hooks/use-developer-job';
import {useRegexCapabilities} from '@/hooks/use-regex-capabilities';
import {TextPanel} from './text-panel';
const flags=['g','i','m','s','u','y','d'];
function MatchHighlight({input,matches,zero,label}:{input:string;matches:RegexMatch[];zero:string;label:string}){
 const parts:React.ReactNode[]=[];let offset=0;
 for(const [i,match]of matches.slice(0,100).entries()){
  parts.push(input.slice(offset,match.index));parts.push(<mark key={i} className={match.index===match.end?'zero-match':''} aria-label={match.index===match.end?`${zero}: ${match.index}`:undefined}>{match.index===match.end?'│':input.slice(match.index,match.end)}</mark>);offset=match.end;
 }
 parts.push(input.slice(offset));return <pre className="regex-highlight" tabIndex={0} aria-label={label}>{parts}</pre>;
}
export function RegexWorkbench({locale}:{locale:Locale}){
 const t=regexCopy[locale];const[pattern,setPattern]=useState('');const[input,setInput]=useState('');const[selected,setSelected]=useState('g');const[status,setStatus]=useState('');const revision=useRef(0);
 const caps=useRegexCapabilities();const{result,error,busy,clear,run,url}=useDeveloperJob();
 function invalidate(){revision.current++;clear();setStatus('');}function reset(all=false){invalidate();setPattern('');setInput('');if(all)setSelected('g');}
 async function copy(){const version=revision.current;try{await navigator.clipboard.writeText(result?.text??'');if(version===revision.current)setStatus(t.copied);}catch{if(version===revision.current)setStatus(t.clipboard);}}
 const report=result?.regex;
 return <section className="workbench" aria-label={t.run}><p className="notice">{t.limits}</p><label className="regex-pattern-label" htmlFor="regex-pattern">{t.pattern}</label><input className="regex-pattern" id="regex-pattern" value={pattern} maxLength={2049} spellCheck={false} onChange={e=>{invalidate();setPattern(e.target.value);}}/>
 <fieldset className="regex-flags"><legend>{t.flags}</legend>{flags.map(flag=><label key={flag}><input type="checkbox" checked={selected.includes(flag)} disabled={!caps.flags?.includes(flag)} aria-label={`Flag ${flag}`} onChange={e=>{invalidate();setSelected(e.target.checked?flags.filter(f=>f===flag||selected.includes(f)).join(''):selected.replace(flag,''));}}/>{flag}{caps.flags&&!caps.flags.includes(flag)&&<small> ({t.unsupported})</small>}</label>)}</fieldset>
 {!caps.flags&&!caps.error&&<p role="status" className="status">{t.checking}</p>}{caps.error&&<p role="alert" className="error">{t.capabilityError} <button className="secondary" onClick={()=>{invalidate();caps.retry();}}>{t.retry}</button></p>}
 <div className="editor-grid"><TextPanel id="regex-input" label={t.input} value={input} maxLength={65537} onChange={e=>{invalidate();setInput(e.target.value);}}/>{report&&<div><div className="editor-heading">{t.highlight}</div><MatchHighlight input={input} matches={report.matches} zero={t.zero} label={t.highlight}/></div>}</div>
 <div className="work-actions developer-actions"><button className="primary" disabled={busy||!caps.flags} onClick={()=>{invalidate();run({id:'regex-tester',operation:'test',pattern,input,flags:selected});}}>{t.run}</button><button className="secondary" onClick={()=>reset()}>{t.clear}</button><button className="secondary" onClick={()=>reset(true)}>{t.reset}</button><button className="secondary" disabled={!report} onClick={copy}>{t.copy}</button>{report&&url&&<a className="primary" href={url} download="regex-matches.json">{t.download} ↓</a>}</div>
 <p role="status" className="status">{busy?t.busy:status||(report?t.done:'')}</p>{error&&<p role="alert" className="error">{t.errors[error as keyof typeof t.errors]??t.errors['engine-error']}</p>}
 {report&&<><h2 className="diff-heading">{t.count}: <span data-testid="match-count">{report.count}</span></h2>{!report.count&&<p>{t.none}</p>}{report.limited&&<p className="notice">{t.limited}</p>}<p className="sample">{t.preview}</p><div className="diff-list">{report.matches.slice(0,100).map((m,i)=><article className="diff-entry regex-match" key={i}><h3>{t.match} {i+1} · {t.index}: {m.index} · {t.end}: {m.end} (UTF-16)</h3><pre>{m.text.slice(0,500)||t.zero}</pre><details><summary>{t.groups}</summary><pre>{JSON.stringify({groups:m.groups,namedGroups:m.namedGroups,indices:m.indices},null,2).slice(0,2000)}</pre></details></article>)}</div><details><summary>JSON</summary><TextPanel id="regex-output" label="JSON" value={result.text.slice(0,50000)} readOnly/></details></>}
 <p className="notice">{t.scope}</p><p className="notice">{t.security}</p></section>;
}
export function RegexContent({locale}:{locale:Locale}){const t=regexCopy[locale];return <><section className="tool-content wrap"><div><h2>{locale==='en'?'Security and limits':'Güvenlik ve sınırlar'}</h2><p>{t.security}</p></div><div><h2>{locale==='en'?'How to use':'Nasıl kullanılır?'}</h2><ol>{t.how.map(s=><li key={s}>{s}</li>)}</ol></div></section><section className="tool-faq wrap"><h2>{locale==='en'?'Frequently asked questions':'Sık sorulan sorular'}</h2>{t.faq.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</section></>;}
