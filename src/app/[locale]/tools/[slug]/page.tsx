import { legacySteps } from '@/lib/tool-examples';
import { ToolExample } from '@/components/tools/tool-example';
import type { toolExamples } from '@/lib/tool-examples';
import { RelatedTools } from '@/components/tools/related-tools';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allTools, toolById } from '@/lib/tools';
import { isXlsxImport, xlsxNotice } from '@/lib/security-policy';
import { pageMetadata } from '@/lib/tool-metadata';
import { PlatformHeader, PlatformFooter } from '@/components/platform-shell';
import ToolWorkbench from '@/components/tool-workbench';
import Converter from '@/components/converter';
import { isDeveloperId } from '@/lib/developer-tools/contracts';
import DeveloperWorkbench from '@/components/tools/developer-workbench';
import DeveloperContent from '@/components/tools/developer-content';
type Props = { params: Promise<{ locale: string; slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return ['en', 'tr'].flatMap(locale => allTools.map(t => ({ locale, slug: t.id }))); }
export async function generateMetadata({ params }: Props) {
 const { locale, slug } = await params; const tool = toolById(slug);
 if (!tool || (locale !== 'en' && locale !== 'tr')) notFound();
 if (isXlsxImport(slug)) return { ...pageMetadata(locale, tool.name[locale], xlsxNotice[locale], `/tools/${slug}`), robots: { index: false, follow: true } };
 return pageMetadata(locale, tool.name[locale], tool.description[locale], `/tools/${slug}`);
}
export default async function Page({ params }: Props) {
 const { locale, slug } = await params; const tool = toolById(slug);
 if (!tool || (locale !== 'en' && locale !== 'tr')) notFound(); const en = locale === 'en';
 if (isXlsxImport(slug)) return <><PlatformHeader locale={locale} path={`/tools/${slug}`}/><main id="main" className="tool-hero wrap"><h1>{tool.name[locale]}</h1><p role="status" className="notice">{xlsxNotice[locale]}</p><Link className="primary" href={`/${locale}`}>{en ? 'Browse available tools' : 'Kullanılabilir araçlara dön'}</Link></main><PlatformFooter locale={locale}/></>;
 if (isDeveloperId(tool.id)) return <><PlatformHeader locale={locale} path={`/tools/${slug}`}/><main id="main"><section className="tool-hero wrap"><Link className="breadcrumb" href={`/${locale}#all-tools`}>← {en?'All tools':'Tüm araçlar'}</Link><h1>{tool.name[locale]}</h1><p>{tool.description[locale]}</p></section><div className="wrap"><DeveloperWorkbench key={`${locale}-${slug}`} id={tool.id} locale={locale}/></div><DeveloperContent id={tool.id} locale={locale}/><ToolExample id={tool.id as keyof typeof toolExamples} locale={locale}/><RelatedTools id={tool.id} locale={locale}/></main><PlatformFooter locale={locale}/></>;
 const csvExcel = slug === 'csv-to-excel';
 return <><PlatformHeader locale={locale} path={`/tools/${slug}`}/><main id="main"><section className="tool-hero wrap"><Link className="breadcrumb" href={`/${locale}#all-tools`}>← {en ? 'All tools' : 'Tüm araçlar'}</Link><div className="eyebrow">{en ? 'FREE · PRIVATE · IN YOUR BROWSER' : 'ÜCRETSİZ · GİZLİ · TARAYICINIZDA'}</div><h1>{tool.name[locale]}</h1><p>{tool.description[locale]}</p></section>{!csvExcel && <div className="wrap"><ToolWorkbench id={tool.id as Exclude<typeof tool.id, 'csv-to-excel'>} locale={locale}/></div>}{csvExcel && <div className="embedded-converter"><Converter locale={locale} embedded/></div>}
 <section className="tool-content wrap"><div><div className="section-label">{en ? 'Made for your workflow' : 'İş akışınız için'}</div><h2>{en ? `When to use ${tool.name.en}` : `${tool.name.tr} kullanım alanları`}</h2><p>{tool.usage[locale]}</p></div><div><h2>{en ? 'How to use' : 'Nasıl kullanılır?'}</h2><ol>{legacySteps[tool.id as keyof typeof legacySteps][en ? 0 : 1].map(step => <li key={step}>{step}</li>)}</ol></div></section>
 <section className="tool-faq wrap"><h2>{en ? 'Frequently asked questions' : 'Sık sorulan sorular'}</h2><details><summary>{en ? `What does ${tool.name.en} do?` : `${tool.name.tr} ne yapar?`}<span>+</span></summary><p>{tool.description[locale]} {tool.usage[locale]}</p></details><details><summary>{en ? 'Is my input uploaded or saved?' : 'Girdim yükleniyor veya saklanıyor mu?'}<span>+</span></summary><p>{en ? 'No. Conversion runs in a browser worker. There are no upload endpoints or content logs. Only your theme preference is saved.' : 'Hayır. Dönüşüm tarayıcı worker’ında çalışır. Yükleme endpoint’i veya içerik kaydı yoktur. Yalnızca tema tercihiniz saklanır.'}</p></details><details><summary>{en ? 'What are the limits and output rules?' : 'Sınırlar ve çıktı kuralları nelerdir?'}<span>+</span></summary><p>{en ? 'Inputs are limited to 5 MB. Tables allow 20,000 rows, 200,000 cells and 1,000 columns. JSON depth is limited to 100. CSV exports prefix dangerous spreadsheet cells with an apostrophe. Excel formulas are never calculated. Preview may be shortened; download contains the complete result.' : 'Girdi sınırı 5 MB. Tablolarda 20.000 satır, 200.000 hücre ve 1.000 sütun sınırı vardır. JSON derinliği 100 ile sınırlıdır. CSV çıktısında tehlikeli tablo hücrelerine tek tırnak eklenir. Excel formülleri hesaplanmaz. Önizleme kısaltılabilir; indirilen dosya tam sonucu içerir.'}</p></details>{slug === 'jwt-decoder' && <details open><summary>{en ? 'Does this verify my JWT?' : 'Bu araç JWT doğrular mı?'}<span>+</span></summary><p>{en ? 'No. Header and payload are decoded only. Signature, expiry, issuer and audience are not verified. Do not use this output to grant access.' : 'Hayır. Yalnızca başlık ve yük çözülür. İmza, süre, yayıncı ve hedef doğrulanmaz. Bu çıktıyı erişim yetkisi vermek için kullanmayın.'}</p></details>}</section><ToolExample id={tool.id as keyof typeof toolExamples} locale={locale}/><RelatedTools id={tool.id} locale={locale}/></main><PlatformFooter locale={locale}/></>;
}
