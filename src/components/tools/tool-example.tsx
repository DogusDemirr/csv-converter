import { toolExamples } from '@/lib/tool-examples';
import type { Locale } from '@/lib/i18n';
export function ToolExample({ id, locale }: { id: keyof typeof toolExamples; locale: Locale }) {
 const [input, output] = toolExamples[id];
 return <section className="tool-content wrap"><div><h2>{locale === 'en' ? 'Practical example' : 'Uygulama örneği'}</h2><h3>{locale === 'en' ? 'Input' : 'Girdi'}</h3><pre className="example-code">{input}</pre></div><div><h3>{locale === 'en' ? 'Result (excerpt)' : 'Sonuç (özet)'}</h3><pre className="example-code">{output}</pre></div></section>;
}
