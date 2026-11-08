import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';
export default function sitemap(): MetadataRoute.Sitemap { return ['en', 'tr'].map(locale => ({ url: `${siteUrl}/${locale}`, alternates: { languages: { en: `${siteUrl}/en`, tr: `${siteUrl}/tr` } } })); }
