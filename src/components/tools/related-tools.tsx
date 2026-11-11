import Link from 'next/link';
import { tools, type ToolId } from '@/lib/tools';
import type { Locale } from '@/lib/i18n';
export function RelatedTools({ id, locale }: { id: ToolId; locale: Locale }) {
 const category = tools.find(tool => tool.id === id)?.category;
 const related = tools.filter(tool => tool.id !== id).sort((a, b) => Number(b.category === category) - Number(a.category === category)).slice(0, 3);
 return <section className="catalog wrap" aria-label={locale === 'en' ? 'Related tools' : 'İlgili araçlar'}><div className="catalog-heading"><h2>{locale === 'en' ? 'Related tools' : 'İlgili araçlar'}</h2><Link href={`/${locale}#all-tools`}>{locale === 'en' ? 'Explore all tools →' : 'Tüm araçları keşfet →'}</Link></div><div className="tool-grid">{related.map(tool => <Link prefetch={false} className="tool-card" key={tool.id} href={`/${locale}/tools/${tool.id}`}><h3>{tool.name[locale]}</h3><p>{tool.description[locale]}</p></Link>)}</div></section>;
}
