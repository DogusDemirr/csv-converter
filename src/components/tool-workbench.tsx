'use client';
import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import type { ToolId } from '@/lib/tools';
import type { Options, Result } from '@/lib/tool-engine';
import { errors } from '@/lib/tool-messages';
export default function ToolWorkbench({ id, locale }: { id: Exclude<ToolId, 'csv-to-excel'>; locale: Locale }) {
 const en = locale === 'en'; const excel = id.startsWith('excel-');
 const [input, setInput] = useState(''); const [file, setFile] = useState<File | null>(null); const [result, setResult] = useState<Result | null>(null);
 const [options, setOptions] = useState<Options>({ mode: 'encode', delimiter: '', sheet: 0 });
 const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [status, setStatus] = useState(''); const [url, setUrl] = useState('');
 const worker = useRef<Worker | null>(null); const fileInput = useRef<HTMLInputElement>(null); const revision = useRef(0);
 useEffect(() => () => worker.current?.terminate(), []);
 useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
 function invalidate() { revision.current++; worker.current?.terminate(); setBusy(false); setResult(null); setUrl(''); setError(''); setStatus(''); }
 function reset() { invalidate(); setInput(''); setFile(null); setOptions({ mode: 'encode', delimiter: '', sheet: 0 }); if (fileInput.current) fileInput.current.value = ''; }
 function run() {
  invalidate(); setBusy(true);
  const version = revision.current;
  try {
   const w = new Worker(new URL('../lib/tools.worker.ts', import.meta.url)); worker.current = w;
   w.onmessage = ({ data }: MessageEvent<{ result?: Result; error?: string }>) => {
    if (version !== revision.current) return;
    setBusy(false); if (data.error) setError(data.error);
    else if (data.result) { setResult(data.result); setUrl(URL.createObjectURL(new Blob([data.result.text], { type: data.result.extension === 'json' ? 'application/json;charset=utf-8' : data.result.extension === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' }))); setStatus(en ? 'Done. Your output is ready.' : 'Tamamlandı. Çıktınız hazır.'); }
    w.terminate();
   };
   w.onerror = () => { setBusy(false); setError('unknown'); w.terminate(); };
   w.postMessage({ id, input, file, options });
  } catch { setBusy(false); setError('unknown'); }
 }
 async function copy() { const version = revision.current; try { await navigator.clipboard.writeText(result?.text ?? ''); if (version === revision.current) setStatus(en ? 'Copied to clipboard.' : 'Panoya kopyalandı.'); } catch { if (version === revision.current) setError('clipboard'); } }
 const accept = excel ? '.xlsx' : id === 'csv-to-json' ? '.csv' : '.json,.txt';
 return <section className="workbench" aria-label={en ? 'Conversion workspace' : 'Dönüşüm alanı'}>
 {id === 'jwt-decoder' && <p className="notice">{en ? 'Decode only. Signatures, expiry and trust are NOT verified. Tokens never leave this browser.' : 'Yalnızca çözümleme. İmza, süre ve güvenilirlik DOĞRULANMAZ. Token tarayıcıdan çıkmaz.'}</p>}
 {excel && <p className="notice">{en ? 'XLSX only. Formulas are never executed. Cached results are exported; missing results become blank.' : 'Yalnızca XLSX. Formüller çalıştırılmaz. Kayıtlı sonuçlar aktarılır; eksik sonuçlar boş kalır.'}</p>}
 <div className="work-options">{id === 'base64' && <label>{en ? 'Operation' : 'İşlem'}<select value={options.mode} onChange={e => { invalidate(); setOptions({ ...options, mode: e.target.value as Options['mode'] }); }}><option value="encode">{en ? 'Encode' : 'Kodla'}</option><option value="decode">{en ? 'Decode' : 'Çöz'}</option></select></label>}
 {['json-to-csv', 'csv-to-json', 'excel-to-csv'].includes(id) && <label>{en ? 'Delimiter' : 'Ayraç'}<select value={options.delimiter} onChange={e => { invalidate(); setOptions({ ...options, delimiter: e.target.value as Options['delimiter'] }); }}><option value="">{id === 'csv-to-json' ? en ? 'Auto-detect' : 'Otomatik algıla' : en ? 'Comma (default)' : 'Virgül (varsayılan)'}</option><option value=",">{en ? 'Comma' : 'Virgül'} (,)</option><option value=";">{en ? 'Semicolon' : 'Noktalı virgül'} (;)</option><option value={'\t'}>{en ? 'Tab' : 'Sekme'}</option></select></label>}
 {excel && <label>{en ? 'Worksheet (1-based)' : 'Çalışma sayfası (1’den başlar)'}<input type="number" min="1" max="100" value={(options.sheet ?? 0) + 1} onChange={e => { invalidate(); setOptions({ ...options, sheet: Math.max(0, Number(e.target.value) - 1) }); }}/></label>}</div>
 <div className="editor-grid"><div><div className="editor-heading"><label htmlFor="tool-input">{en ? 'Input' : 'Girdi'}</label><span>{en ? 'Max 5 MB · processed locally' : 'En fazla 5 MB · yerel işlem'}</span></div>
 {!['base64', 'jwt-decoder'].includes(id) && <label className="file-picker">{en ? 'Choose file' : 'Dosya seç'} ({accept})<input ref={fileInput} type="file" accept={accept} onChange={e => { const f = e.target.files?.[0] ?? null; invalidate(); setFile(f); setOptions({ ...options, sheet: 0 }); e.target.value = ''; }}/></label>}
 {file && <p className="selected-file">{file.name} · {(file.size / 1024).toFixed(1)} KB <button className="secondary" onClick={() => { invalidate(); setFile(null); }}>{en ? 'Remove' : 'Kaldır'}</button></p>}
 {!excel ? <textarea id="tool-input" spellCheck={false} value={input} disabled={!!file} onChange={e => { invalidate(); setInput(e.target.value); }} placeholder={en ? 'Paste your data here…' : 'Verilerinizi buraya yapıştırın…'}/> : <div id="tool-input" className="excel-placeholder">▦<p>{en ? 'Select an XLSX file, choose a worksheet number and convert.' : 'XLSX dosyası seçin, çalışma sayfası numarasını belirleyin ve dönüştürün.'}</p></div>}
 </div><div><div className="editor-heading"><label htmlFor="tool-output">{en ? 'Output preview' : 'Çıktı önizlemesi'}</label><span>{en ? 'First 50,000 characters' : 'İlk 50.000 karakter'}</span></div><textarea id="tool-output" readOnly spellCheck={false} value={result?.text.slice(0, 50000) ?? ''} placeholder={en ? 'Your result will appear here.' : 'Sonucunuz burada görünecek.'}/>{result?.sheets && <p className="sample">{en ? 'Worksheets' : 'Çalışma sayfaları'}: {result.sheets.map((name, i) => `${i + 1}. ${name}`).join(' · ')}</p>}<p className="sample">{en ? 'Copy and download include the complete output.' : 'Kopyalama ve indirme tam çıktıyı içerir.'}</p></div></div>
 {error && <p role="alert" className="error">{errors[locale][error as keyof typeof errors.en] ?? errors[locale].unknown}</p>}<p className="status" role="status">{busy ? en ? 'Processing in your browser…' : 'Tarayıcınızda işleniyor…' : status}</p><div className="work-actions"><button className="primary" disabled={busy} onClick={run}>{en ? 'Run tool' : 'Aracı çalıştır'} →</button><button className="secondary" onClick={reset}>{en ? 'Clear / Reset' : 'Temizle / Sıfırla'}</button><button className="secondary" disabled={!result || busy} onClick={copy}>{en ? 'Copy output' : 'Çıktıyı kopyala'}</button>{url && <a className="primary" href={url} download={`${id}.${result?.extension}`}>{en ? 'Download' : 'İndir'} ↓</a>}</div></section>;
}
