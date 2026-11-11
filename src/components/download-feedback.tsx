'use client';
import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n';
export function DownloadFeedback({ locale }: { locale: Locale }) {
 const [count, setCount] = useState(0); const [visible, setVisible] = useState(false); const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 useEffect(() => {
  function clicked(event: MouseEvent) {
   if (!(event.target instanceof Element) || !event.target.closest('a[download]')) return;
   setCount(value => value + 1); setVisible(true); clearTimeout(timer.current); timer.current = setTimeout(() => setVisible(false), 6000);
  }
  document.addEventListener('click', clicked);
  return () => { document.removeEventListener('click', clicked); clearTimeout(timer.current); };
 }, []);
 return <div role="status" aria-live="polite" aria-atomic="true" data-testid="download-feedback" className={visible ? 'download-feedback' : 'sr-only'}>{visible && <>{locale === 'en' ? 'Download requested. Your browser controls saving.' : 'İndirme istendi. Kaydetme işlemini tarayıcınız yönetir.'}<span className="sr-only"> {count}</span></>}</div>;
}
