import { notFound } from 'next/navigation';
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
 const { locale } = await params; if (locale !== 'en' && locale !== 'tr') notFound();
 return <html lang={locale} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}" }}/></head><body>{children}</body></html>;
}
