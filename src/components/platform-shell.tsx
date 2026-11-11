'use client';
import Link from 'next/link';
import { brand } from '@/lib/brand';
import { BrandMark } from './brand-mark';
import { DownloadFeedback } from './download-feedback';
import type { Locale } from '@/lib/i18n';
export function PlatformHeader({ locale, path = '' }: { locale: Locale; path?: string }) {
 return <><a className="skip" href="#main">{locale === 'en' ? 'Skip to content' : 'İçeriğe geç'}</a><header className="header wrap"><Link className="brand" aria-label={brand.homeLabel[locale]} href={`/${locale}`}><BrandMark/>{brand.name}</Link><nav aria-label={locale === 'en' ? 'Main navigation' : 'Ana gezinme'}><Link href={`/${locale}#all-tools`}>{locale === 'en' ? 'Explore tools' : 'Araçları keşfet'}</Link></nav><div className="header-actions"><Link className="language" href={`/${locale === 'en' ? 'tr' : 'en'}${path}`} lang={locale === 'en' ? 'tr' : 'en'}>{locale === 'en' ? 'TR' : 'EN'} ↗</Link><button className="theme" aria-label={locale === 'en' ? 'Toggle theme' : 'Temayı değiştir'} onClick={() => { const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; try { localStorage.setItem('theme', theme); } catch {} }}>◐</button></div></header><DownloadFeedback locale={locale}/></>;
}
export function PlatformFooter({ locale }: { locale: Locale }) { return <footer className="footer wrap"><Link className="brand" aria-label={brand.homeLabel[locale]} href={`/${locale}`}><BrandMark/>{brand.name}</Link><p>{brand.tagline[locale]}</p><span>{locale === 'en' ? 'Free · Private · No account' : 'Ücretsiz · Gizli · Üyelik yok'}</span><nav aria-label={locale === "en" ? "Policies" : "Politikalar"}>{[["privacy", "Privacy Policy", "Gizlilik"],["terms", "Terms", "Ko\u015fullar"],["contact", "Contact", "\u0130leti\u015fim"]].map(([path,en,tr]) => <Link key={path} href={`/${locale}/${path}`}>{locale === "en" ? en : tr}</Link>)}</nav></footer>; }
