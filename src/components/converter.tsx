'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { copy, type Locale } from '@/lib/i18n';
import type { Delimiter } from '@/lib/csv';
import { validateFile } from '@/lib/file-validation';
type Preview = { rows: string[][]; count: number; columns: number; delimiter: string };
export default function Converter({ locale, embedded = false }: { locale: Locale; embedded?: boolean }) {
 const t = copy[locale];
 const worker = useRef<Worker | null>(null);
 const input = useRef<HTMLInputElement>(null);
 const [file, setFile] = useState<File | null>(null);
 const [delimiter, setDelimiter] = useState<Delimiter>('');
 const [preview, setPreview] = useState<Preview | null>(null);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [url, setUrl] = useState('');
 const [drag, setDrag] = useState(false);
 useEffect(() => () => worker.current?.terminate(), []);
 useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
 function parse(next: File, separator: Delimiter) {
  worker.current?.terminate(); setPreview(null); setUrl(''); setError(''); setFile(next);
  try { validateFile(next); } catch (e) { setError(e instanceof Error ? e.message : 'unknown'); setBusy(false); return; }
  setBusy(true);
  try {
   const w = new Worker(new URL('../lib/converter.worker.ts', import.meta.url)); worker.current = w;
   w.onmessage = ({ data }) => {
    setBusy(false);
    if (data.type === 'parsed') setPreview(data);
    else if (data.type === 'exported') setUrl(URL.createObjectURL(new Blob([data.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })));
    else setError(data.code);
   };
   w.onerror = () => { setBusy(false); setError('unknown'); };
   w.postMessage({ type: 'parse', file: next, delimiter: separator });
  } catch { setBusy(false); setError('unknown'); }
 }
 function clear() { worker.current?.terminate(); setFile(null); setPreview(null); setUrl(''); setError(''); setBusy(false); if (input.current) input.current.value = ''; }
 const converterPanel = (  <section id="converter" className="converter wrap" aria-label={t.tool}><div className="tool-heading"><div><span className="tool-icon">▦</span><div><h2>{t.tool}</h2><p>{t.toolSub}</p></div></div><span className="local-tag">● {locale === 'en' ? '100% on-device' : '%100 cihazınızda'}</span></div>
   <div className="tool-body"><div className="upload-column"><div className={`dropzone ${drag ? 'drag' : ''}`} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) parse(f, delimiter); }}><span className="upload-icon" aria-hidden="true">↥</span><h3>{t.drop}</h3><p>{t.or}</p><input ref={input} className="sr-only" id="csv-file" aria-label={t.choose} tabIndex={-1} type="file" accept=".csv,text/csv" onChange={e => { const f = e.target.files?.[0]; if (f) parse(f, delimiter); e.target.value = ''; }}/><button className="primary" onClick={() => input.current?.click()}>{t.choose} <span>↗</span></button><small>{t.limit}</small></div>
    {file && <div className="file-info"><span>▤ <strong>{file.name}</strong><small>{(file.size / 1024).toFixed(1)} KB</small></span><button onClick={clear} aria-label={t.reset}>×</button></div>}
    <label className="separator" htmlFor="separator">{t.delimiter}<select id="separator" value={delimiter} disabled={busy} onChange={e => { const d = e.target.value as Delimiter; setDelimiter(d); if (file) parse(file, d); }}><option value="">{t.auto}</option><option value=",">{t.comma} (,)</option><option value=";">{t.semi} (;)</option><option value={'\t'}>{t.tab} (↹)</option></select></label><p className="privacy">♧ {t.privacy}</p></div>
    <div className="preview-column"><div className="preview-heading"><h3>{t.preview}</h3>{preview && <span>{preview.count.toLocaleString(locale)} {t.rows} · {preview.columns} {t.columns} · {preview.delimiter === '\t' ? '↹' : preview.delimiter}</span>}</div><div className="preview-area" aria-busy={busy}>{preview ? <div className="table-scroll" tabIndex={0} aria-label={t.preview}><table><thead><tr>{preview.rows[0].map((cell, i) => <th key={i} scope="col">{cell || `#${i + 1}`}</th>)}</tr></thead><tbody>{preview.rows.slice(1).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div> : <div className="empty"><div className="sheet-art"><span/><span/><span/><span/><span/><span/></div><h3>{t.empty}</h3><p>{t.emptySub}</p></div>}</div><p className="sample">{preview ? t.sample : 'UTF-8 · CSV · XLSX'}</p><div aria-live="polite" role="status" className="status">{busy ? t.busy : url ? t.ready : ''}</div>{error && <p role="alert" className="error">{t.errors[error as keyof typeof t.errors] || t.errors.unknown}</p>}{url ? <a className="primary convert" href={url} download={`${file?.name.replace(/\.csv$/i, '') || 'spreadsheet'}.xlsx`}>{t.download} ↓</a> : <button className="primary convert" disabled={!preview || busy} onClick={() => { setBusy(true); setError(''); worker.current?.postMessage({ type: 'export' }); }}>{busy ? t.busy : t.convert} <span>→</span></button>}</div></div>
  </section>);
 if (embedded) return converterPanel;
 return <>
  <a className="skip" href="#converter">{t.tool}</a>
  <header className="header wrap"><Link href={`/${locale}`} className="brand"><span className="logo">▦</span>csv<span className="brand-light">converter</span><span className="brand-dot">.</span></Link><nav aria-label={locale === 'en' ? 'Main navigation' : 'Ana gezinme'}><a href="#how">{t.nav}</a><a href="#faq">{t.faq}</a></nav><div className="header-actions"><Link href={locale === 'en' ? '/tr' : '/en'} lang={locale === 'en' ? 'tr' : 'en'} className="language">{locale === 'en' ? 'TR' : 'EN'} ↗</Link><button className="theme" aria-label={locale === 'en' ? 'Toggle color theme' : 'Renk temasını değiştir'} onClick={() => { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {} }}>◐</button></div></header>
  <main><section className="hero wrap"><div className="eyebrow"><span/> {t.badge}</div><h1>{t.title}<br/><span>{t.accent}</span></h1><p>{t.intro}</p><div className="hero-trust"><span>✓ {t.free}</span><span>✓ .csv → .xlsx</span></div></section>
  {converterPanel}<section id="how" className="steps wrap"><div className="section-label">{t.nav}</div><h2>{t.stepsTitle}</h2><div className="step-grid">{t.steps.map(([title, text], i) => <article key={title}><span className="step-number">0{i + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section><section id="faq" className="faq wrap"><div><div className="section-label">{t.faq}</div><h2>{t.faqTitle}</h2><p>{t.privacy}</p></div><div>{t.faqs.map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section></main><footer className="footer wrap"><Link href={`/${locale}`} className="brand">▦ csvconverter.</Link><p>{t.footer}</p><span>© 2026 CSV Converter</span></footer>
 </>;
}

