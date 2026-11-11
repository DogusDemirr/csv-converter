import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';
import { tools } from '@/lib/tools';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
 if (!siteUrl) return [];
 return ['', ...tools.map(t => `/tools/${t.id}`)].flatMap(path => ['en', 'tr'].map(locale => ({ url: `${siteUrl}/${locale}${path}`, alternates: { languages: { en: `${siteUrl}/en${path}`, tr: `${siteUrl}/tr${path}` } } })));
}
