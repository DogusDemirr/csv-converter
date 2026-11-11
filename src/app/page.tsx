import { redirect } from 'next/navigation';
import Link from 'next/link';
export default function Home() {
 if (process.env.STATIC_EXPORT === '1') return <html lang="en"><body><main><h1>Online Tools</h1><p><Link href="/en">English</Link> · <Link href="/tr">Türkçe</Link></p></main></body></html>;
 redirect('/en');
}
