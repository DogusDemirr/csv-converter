import { notFound } from 'next/navigation';
import Converter from '@/components/converter';
import ToolDirectory from '@/components/tool-directory';
import { PlatformHeader, PlatformFooter } from '@/components/platform-shell';
import { pageMetadata } from '@/lib/tool-metadata';
export const dynamicParams = false;
export function generateStaticParams() { return [{ locale: 'en' }, { locale: 'tr' }]; }
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params; if (locale !== 'en' && locale !== 'tr') notFound();
 return pageMetadata(locale, locale === 'en' ? 'Free Online JSON, CSV, Excel & Text Tools' : 'Ücretsiz JSON, CSV, Excel ve Metin Araçları', locale === 'en' ? 'Free tools for JSON formatting, data conversion, Base64 and JWT decoding. Private browser processing, no uploads or sign-up.' : 'JSON düzenleme, veri dönüştürme, Base64 ve JWT çözümleme araçları. Dosyalar tarayıcınızda işlenir, yükleme veya üyelik yok.');
}
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params; if (locale !== 'en' && locale !== 'tr') notFound(); const en = locale === 'en';
 return <><PlatformHeader locale={locale}/><main id="main"><section className="hero wrap platform-hero"><div className="eyebrow"><span/>{en ? 'SMALL TOOLS. BIG POSSIBILITIES.' : 'KÜÇÜK ARAÇLAR. BÜYÜK OLASILIKLAR.'}</div><h1>{en ? 'Your everyday tasks.' : 'Günlük işleriniz.'}<br/><span>{en ? 'A little easier.' : 'Biraz daha kolay.'}</span></h1><p>{en ? 'Format, convert and explore your data with thoughtfully built tools. Free to use. Private by design. Ready when you are.' : 'Özenle hazırlanan araçlarla verilerinizi düzenleyin, dönüştürün ve inceleyin. Ücretsiz, gizlilik odaklı ve her zaman hazır.'}</p><div className="hero-trust"><span>✓ {en ? 'No uploads' : 'Yükleme yok'}</span><span>✓ {en ? 'No account' : 'Üyelik yok'}</span><span>✓ {en ? '100% free' : '%100 ücretsiz'}</span></div></section><ToolDirectory locale={locale}/></main><section className="legacy-intro wrap"><div className="section-label">{en ? 'The original, still here' : 'İlk aracımız, hâlâ burada'}</div><h2>{en ? 'CSV to Excel, one click away.' : 'CSV → Excel, tek tık uzağınızda.'}</h2><p>{en ? 'Your familiar converter stays available on this page.' : 'Alıştığınız dönüştürücü bu sayfada kullanılmaya devam ediyor.'}</p></section><div className="embedded-converter"><Converter locale={locale}/></div><PlatformFooter locale={locale}/></>;
}
