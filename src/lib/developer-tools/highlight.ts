export type HighlightToken={kind:'plain'|'keyword'|'string'|'comment'|'number';text:string};
const keywords=new Set('export interface type string number boolean null unknown readonly extends keyof select from where and or not as join left right on with union all order by group having insert into values update set delete case when then else end top cast convert int nvarchar'.split(' '));
export function highlight(text:string):HighlightToken[]{
 const source=text.slice(0,50000);const out:HighlightToken[]=[];let i=0;
 const token=/\/\/[^\r\n]*|--[^\r\n]*|\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|""|[^"\\])*"|'(?:\\[\s\S]|''|[^'\\])*'|\[(?:\]\]|[^\]])*\]|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[\s\S]/y;
 while(i<source.length){if(out.length>=5000){out.push({kind:'plain',text:source.slice(i)});break;}token.lastIndex=i;const part=token.exec(source)?.[0]??source[i];i+=part.length;
  const kind:HighlightToken['kind']=/^(\/\/|--|\/\*)/.test(part)?'comment':/^["'\[]/.test(part)?'string':/^\d/.test(part)?'number':keywords.has(part.toLowerCase())?'keyword':'plain';
  const last=out[out.length-1];if(kind==='plain'&&last?.kind==='plain')last.text+=part;else out.push({kind,text:part});
 }
 return out;
}
