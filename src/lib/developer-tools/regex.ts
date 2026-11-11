import {byteSize,OUTPUT_BYTES} from './json';
export const REGEX_FLAGS=['g','i','m','s','u','y','d'] as const;
export const MAX_MATCHES=1000;
export const MAX_CAPTURES=32;
export type RegexMatch={text:string;index:number;end:number;groups:(string|null)[];namedGroups:Record<string,string|null>;indices?:{match:[number,number];groups:([number,number]|null)[];namedGroups:Record<string,[number,number]|null>}};
export type RegexReport={count:number;limited:boolean;indexUnit:'UTF-16';matches:RegexMatch[]};
export function supportedRegexFlags(){return REGEX_FLAGS.filter(flag=>{try{new RegExp('',flag);return true;}catch{return false;}});}
function validateCaptures(pattern:string){
 let captures=0,inClass=false;
 for(let i=0;i<pattern.length;i++){
  const c=pattern[i];if(c==='\\'){i++;continue;}if(c==='['&&!inClass){inClass=true;continue;}if(c===']'&&inClass){inClass=false;continue;}
  if(!inClass&&c==='('&&(pattern[i+1]!=='?'||(pattern.slice(i+1,i+3)==='?<'&&!['=','!'].includes(pattern[i+3]??''))))if(++captures>MAX_CAPTURES)throw new Error('regex-capture-limit');
 }
}
export function advanceRegexIndex(text:string,index:number,unicode:boolean){
 if(unicode&&index+1<text.length){const first=text.charCodeAt(index),second=text.charCodeAt(index+1);if(first>=0xd800&&first<=0xdbff&&second>=0xdc00&&second<=0xdfff)return index+2;}
 return index+1;
}
// This function must only receive untrusted patterns inside a disposable worker.
// Synchronous RegExp.exec cannot be interrupted by an in-worker timer.
export function testRegex(pattern:string,input:string,flags:string){
 if(pattern.length>2048)throw new Error('regex-pattern-limit');
 if(input.length>65536||byteSize(input)>65536)throw new Error('regex-text-limit');
 if(flags.length>7||new Set(flags).size!==flags.length||[...flags].some(f=>!REGEX_FLAGS.includes(f as typeof REGEX_FLAGS[number])))throw new Error('regex-flags');
 const supported=supportedRegexFlags();if([...flags].some(f=>!supported.includes(f as typeof supported[number])))throw new Error('regex-unsupported-flag');
 validateCaptures(pattern);let regex:RegExp;
 try{regex=new RegExp(pattern,flags);}catch{throw new Error('regex-syntax');}
 const report:RegexReport={count:0,limited:false,indexUnit:'UTF-16',matches:[]};let bytes=256;
 for(;;){const m=regex.exec(input);if(!m)break;if(m.length-1>MAX_CAPTURES)throw new Error('regex-capture-limit');
  const match:RegexMatch={text:m[0],index:m.index,end:m.index+m[0].length,groups:m.slice(1).map(v=>v??null),namedGroups:Object.fromEntries(Object.entries(m.groups??{}).map(([k,v])=>[k,v??null]))};
  if(m.indices)match.indices={match:[m.index,m.index+m[0].length],groups:m.indices.slice(1).map(v=>v??null),namedGroups:Object.fromEntries(Object.entries(m.indices.groups??{}).map(([k,v])=>[k,v??null]))};
  bytes+=byteSize(JSON.stringify(match,null,2))+256;if(bytes>OUTPUT_BYTES)throw new Error('regex-output-limit');
  report.matches.push(match);report.count++;
  if(!flags.includes('g'))break;
  if(report.count===MAX_MATCHES){report.limited=true;break;}
  if(m[0].length===0)regex.lastIndex=advanceRegexIndex(input,regex.lastIndex,flags.includes('u'));
 }
 const text=JSON.stringify(report,null,2);if(byteSize(text)>OUTPUT_BYTES)throw new Error('regex-output-limit');
 return {text,regex:report,warnings:report.limited?['regex-match-limit']:[]};
}
