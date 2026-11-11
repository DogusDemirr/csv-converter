import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';
export default function NotFound() {
 return <html lang="en"><body><main id="main" className="tool-hero wrap"><Link href="/en" className="brand" aria-label="Nexutool home"><BrandMark/>Nexutool</Link><p className="section-label">404</p><h1>Page not found</h1><p lang="tr">Sayfa bulunamadı.</p><p>This address is unavailable. Choose your language to explore the available tools.</p><p lang="tr">Bu adres mevcut değil. Kullanılabilir araçlar için dilinizi seçin.</p><nav aria-label="Choose language / Dil seçin"><Link className="primary" href="/en" lang="en">English</Link>{' '}<Link className="secondary" href="/tr" lang="tr">Türkçe</Link></nav></main></body></html>;
}
