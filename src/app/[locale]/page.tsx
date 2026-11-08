import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Converter from '@/components/converter';
import { copy } from '@/lib/i18n';
import { siteUrl } from '@/lib/seo';
export const dynamicParams = false;
export function generateStaticParams() { return [{ locale: 'en' }, { locale: 'tr' }]; }
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
 const { locale } = await params; if (locale !== 'en' && locale !== 'tr') notFound();
 const title = locale === 'en' ? 'CSV to Excel Converter — Free & Private | CSV Converter' : 'CSV Excel Dönüştürücü — Ücretsiz ve Güvenli | CSV Converter';
 return { metadataBase: new URL(siteUrl), title, description: copy[locale].intro, alternates: { canonical: `/${locale}`, languages: { en: '/en', tr: '/tr', 'x-default': '/en' } }, openGraph: { title, description: copy[locale].intro, url: `/${locale}`, type: 'website', locale: locale === 'en' ? 'en_US' : 'tr_TR', siteName: 'CSV Converter' }, twitter: { card: 'summary', title, description: copy[locale].intro } };
}
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (locale !== 'en' && locale !== 'tr') notFound(); return <Converter locale={locale}/>; }
