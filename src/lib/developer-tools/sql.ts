import {byteSize,OUTPUT_BYTES} from './json';
import {sqlTokens,SQL_KEYWORDS,type SqlToken} from './sql-lex';
export type SqlOptions={dialect:'transactsql'|'sql';keywordCase:'upper'|'lower'|'preserve';indent:2|4};
export function verifySqlPreservation(before:SqlToken[],after:SqlToken[],casing:SqlOptions['keywordCase']){
 if(before.length!==after.length)throw new Error('sql-preservation');
 for(let i=0;i<before.length;i++){const a=before[i],b=after[i];if(a.kind!==b.kind)throw new Error('sql-preservation');if(a.text===b.text)continue;const expected=casing==='upper'?a.text.toUpperCase():casing==='lower'?a.text.toLowerCase():a.text;if(a.kind!=='word'||!SQL_KEYWORDS.has(a.text.toUpperCase())||b.text!==expected)throw new Error('sql-preservation');}
}
export async function formatSql(input:string,options:SqlOptions){
 if(!input.trim())throw new Error('empty-input');if(byteSize(input)>256*1024||input.split(/\r\n|\r|\n/).length>10000)throw new Error('sql-limit');
 if(!['transactsql','sql'].includes(options.dialect)||!['upper','lower','preserve'].includes(options.keywordCase)||![2,4].includes(options.indent))throw new Error('invalid-request');
 const before=sqlTokens(input);const words=before.filter(t=>t.kind==='word').map(t=>t.text.toUpperCase());
 let depth=0;for(const token of before){if(token.kind!=='symbol')continue;if(token.text==='('&&++depth>100)throw new Error('sql-limit');if(token.text===')'&&--depth<0)throw new Error('sql-invalid');}if(depth)throw new Error('sql-invalid');
 if(words.includes('GO'))throw new Error('sql-batch');
 if(/\b(?:CREATE(?: OR ALTER)?|ALTER) (?:PROC|PROCEDURE|FUNCTION|TRIGGER)\b/.test(words.join(' '))||words.some(w=>['DECLARE','EXEC','EXECUTE','WHILE','BEGIN','IF','WAITFOR','CURSOR'].includes(w))||/BEGIN (TRY|CATCH)/.test(words.join(' ')))throw new Error('sql-unsupported');
 if(before.some(t=>t.kind==='comment'&&/sql-formatter-(disable|enable)/i.test(t.text)))throw new Error('sql-unsupported');
 const {format}=await import('sql-formatter');let text:string;
 try{text=format(input,{language:options.dialect,keywordCase:options.keywordCase,tabWidth:options.indent,useTabs:false,identifierCase:'preserve',functionCase:'preserve',dataTypeCase:'preserve',...(options.dialect==='sql'?{paramTypes:{named:[':'] as ':'[],positional:true}}:{})});}catch{throw new Error('sql-unsupported');}
 if(byteSize(text)>OUTPUT_BYTES)throw new Error('output-limit');verifySqlPreservation(before,sqlTokens(text),options.keywordCase);
 return {text,warnings:['sql-not-validation']};
}
