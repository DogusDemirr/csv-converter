import { validateRequest, type Response } from './contracts';
self.onmessage = async ({ data }: MessageEvent<unknown>) => {
 let requestId = 0;
 try {
  validateRequest(data); requestId = data.requestId;
  if (data.id === 'json-diff') {
   const { jsonDiff } = await import('./json-diff'); const result = jsonDiff(data.left,data.right);
   self.postMessage({ version: 1, requestId, result: { ...result, extension:'json', warnings:[] } } satisfies Response);
  } else if(data.id==='json-to-csharp') {
   const { jsonToCsharp } = await import('./csharp'); const result = jsonToCsharp(data.input,data.options);
   self.postMessage({ version: 1, requestId, result: { ...result, extension:'cs' } } satisfies Response);
  } else if(data.id==='json-to-typescript') {
   const {jsonToTypeScript}=await import('./typescript');const result=jsonToTypeScript(data.input,data.options);
   self.postMessage({version:1,requestId,result:{...result,extension:'ts'}} satisfies Response);
  } else if(data.id==='sql-formatter') {
   const {formatSql}=await import('./sql');const result=await formatSql(data.input,data.options);
   self.postMessage({version:1,requestId,result:{...result,extension:'sql'}} satisfies Response);
  } else {
   const {supportedRegexFlags,testRegex}=await import('./regex');
   const result=data.operation==='capabilities'?{text:'',warnings:[],supportedFlags:supportedRegexFlags()}:testRegex(data.pattern,data.input,data.flags);
   self.postMessage({version:1,requestId,result:{...result,extension:'json'}} satisfies Response);
  }
 } catch (e) {
  const code = e instanceof Error && /^(empty-(left|right|input)|invalid-(left|right|input|root|name|request|type-name)|input-limit|structure-limit|unsafe-number|output-limit|model-limit|ts-interface-root|sql-(limit|invalid|unsupported|batch|preservation)|regex-(pattern-limit|text-limit|flags|unsupported-flag|capture-limit|syntax|output-limit))$/.test(e.message) ? e.message : 'engine-error';
  self.postMessage({ version: 1, requestId, error:code } satisfies Response);
 }
};
