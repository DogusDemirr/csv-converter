import type { Locale } from '@/lib/i18n';
import type { DeveloperId } from '@/lib/developer-tools/contracts';
import { developerCopy } from '@/lib/developer-tool-copy';
import {Phase52Content} from './phase52-workbench';
import {RegexContent} from './regex-workbench';
export default function DeveloperContent({id,locale}:{id:DeveloperId;locale:Locale}) {
 if(id==='regex-tester')return <RegexContent locale={locale}/>;
 if(id==='json-to-typescript'||id==='sql-formatter')return <Phase52Content id={id} locale={locale}/>;
 const t=developerCopy[locale];const diff=id==='json-diff';
 return <><section className="tool-content wrap"><div><h2>{locale==='en'?'What this tool does':'Bu araç ne yapar?'}</h2><p>{diff?t.diffIntro:t.csIntro}</p></div><div><h2>{locale==='en'?'How to use':'Nasıl kullanılır?'}</h2><ol>{(diff?t.diffHow:t.csHow).map(step=><li key={step}>{step}</li>)}</ol></div></section><section className="tool-faq wrap"><h2>{locale==='en'?'Frequently asked questions':'Sık sorulan sorular'}</h2>{(diff?t.diffFaq:t.csFaq).map(([question,answer])=><details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</section></>;
}
