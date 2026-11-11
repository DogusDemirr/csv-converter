'use client';
import {useMemo} from 'react';
import {highlight} from '@/lib/developer-tools/highlight';
export function CodePreview({text,label}:{text:string;label:string}){
 const tokens=useMemo(()=>highlight(text),[text]);
 return <div><div className="editor-heading">{label}</div><pre className="code-preview" role="region" tabIndex={0} aria-label={label}><code>{tokens.map((t,i)=><span key={i} className={`syntax-${t.kind}`}>{t.text}</span>)}</code></pre></div>;
}
