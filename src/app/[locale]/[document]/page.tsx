import { notFound } from 'next/navigation';
import { legalContent, legalSlugs, type LegalSlug } from '@/lib/legal-content';
import { pageMetadata } from '@/lib/tool-metadata';
import { PlatformHeader, PlatformFooter } from '@/components/platform-shell';
type Props = { params: Promise<{locale:string;document:string}> };
export const dynamicParams = false;
export function generateStaticParams() { return ['en','tr'].flatMap(locale=>legalSlugs.map(document=>({locale,document}))); }
function resolve(locale:string,document:string) {
 if ((locale!=='en'&&locale!=='tr') || !legalSlugs.includes(document as LegalSlug)) notFound();
 return {locale,document:document as LegalSlug} as const;
}
export async function generateMetadata({params}:Props) {
 const p=await params;const {locale,document}=resolve(p.locale,p.document);const content=legalContent[locale][document];
 return {...pageMetadata(locale,content.title,content.description,`/${document}`),robots:{index:false,follow:true}};
}
export default async function Page({params}:Props) {
 const p=await params;const {locale,document}=resolve(p.locale,p.document);const content=legalContent[locale][document];
 return <><PlatformHeader locale={locale} path={`/${document}`}/><main id="main" className="wrap tool-hero"><h1>{content.title}</h1><p className="notice">{legalContent[locale].draft}</p><p>{locale==='en'?'Draft reviewed: 11 November 2026. No effective date has been set.':'Taslak kontrolü: 11 Kasım 2026. Yürürlük tarihi belirlenmedi.'}</p>{content.sections.map(([title,text])=><section key={title}><h2>{title}</h2><p>{text}</p></section>)}</main><PlatformFooter locale={locale}/></>;
}
