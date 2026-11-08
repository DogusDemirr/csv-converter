import type { Metadata } from 'next';
import type { Locale } from './i18n';
import { siteUrl } from './seo';
export function pageMetadata(locale: Locale, title: string, description: string, path = ''): Metadata {
 const url = `/${locale}${path}`;
 return { ...(siteUrl ? { metadataBase: new URL(siteUrl), alternates: { canonical: url, languages: { en: `/en${path}`, tr: `/tr${path}`, 'x-default': `/en${path}` } } } : {}), robots: { index: !!siteUrl, follow: !!siteUrl }, title: `${title} | Online Tools`, description, openGraph: { title, description, ...(siteUrl ? { url: `${siteUrl}${url}` } : {}), type: 'website', locale: locale === 'en' ? 'en_US' : 'tr_TR', siteName: 'Online Tools' }, twitter: { card: 'summary', title, description } };
}
