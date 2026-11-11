import type { Metadata } from 'next';
import type { Locale } from './i18n';
import { siteUrl } from './seo';
import { brand } from './brand';
export function pageMetadata(locale: Locale, title: string, description: string, path = ''): Metadata {
 const url = `/${locale}${path}`;
 return { applicationName: brand.name, icons: { apple: '/icons/nexutool-192.png' }, ...(siteUrl ? { metadataBase: new URL(siteUrl), alternates: { canonical: url, languages: { en: `/en${path}`, tr: `/tr${path}`, 'x-default': `/en${path}` } } } : {}), robots: { index: !!siteUrl, follow: !!siteUrl }, title: `${title} | ${brand.name}`, description, openGraph: { title: `${title} | ${brand.name}`, description, ...(siteUrl ? { url: `${siteUrl}${url}` } : {}), type: 'website', locale: locale === 'en' ? 'en_US' : 'tr_TR', siteName: brand.name }, twitter: { card: 'summary', title: `${title} | ${brand.name}`, description } };
}
