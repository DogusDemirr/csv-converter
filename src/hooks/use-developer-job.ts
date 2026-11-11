'use client';
import { useEffect, useRef, useState } from 'react';
import type { Request, Response, Result } from '@/lib/developer-tools/contracts';
type Payload = Request extends infer R ? R extends Request ? Omit<R,'version'|'requestId'> : never : never;
export function useDeveloperJob() {
 const job = useRef<{worker:Worker; timer:ReturnType<typeof setTimeout>} | null>(null);
 const revision = useRef(0);
 const [result,setResult] = useState<Result|null>(null); const [error,setError] = useState(''); const [busy,setBusy] = useState(false); const [url,setUrl]=useState('');
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
 function stop() { if (job.current) { clearTimeout(job.current.timer); job.current.worker.terminate(); job.current=null; } }
 useEffect(()=>()=>{ revision.current++; if(job.current) {clearTimeout(job.current.timer);job.current.worker.terminate();} },[]);
 function clear() { revision.current++; stop(); setBusy(false);setResult(null);setError('');setUrl(''); }
 function run(payload:Payload) {
  clear();setBusy(true);const requestId=revision.current;
  try {
   const worker=new Worker(new URL('../lib/developer-tools/developer-tools.worker.ts',import.meta.url));
   const timer=setTimeout(()=>{if(revision.current===requestId&&job.current?.worker===worker){stop();setBusy(false);setError('timeout');}},payload.id==='regex-tester'?1500:5000);
   job.current={worker,timer};
   worker.onmessage=({data}:MessageEvent<Response>)=>{
    if(revision.current!==requestId || !job.current || data.version!==1 || data.requestId!==requestId) return;
    stop();setBusy(false);if(data.error) setError(data.error);else if(data.result) {setResult(data.result);setUrl(URL.createObjectURL(new Blob([data.result.text],{type:data.result.extension==='json'?'application/json;charset=utf-8':'text/plain;charset=utf-8'})));}
   };
   const failed=()=>{if(revision.current===requestId&&job.current?.worker===worker){stop();setBusy(false);setError('engine-error');}};
   worker.onerror=failed;worker.onmessageerror=failed;
   worker.postMessage({...payload,version:1,requestId} satisfies Request);
  } catch { stop();setBusy(false);setError('engine-error'); }
 }
 return {result,error,busy,clear,run,url};
}
