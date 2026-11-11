'use client';
import {useEffect,useState} from 'react';
import type {Request,Response} from '@/lib/developer-tools/contracts';
export function useRegexCapabilities(){
 const[state,setState]=useState<{flags:string[]|null;error:boolean}>({flags:null,error:false});const[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let worker:Worker|undefined;let timer:ReturnType<typeof setTimeout>|undefined;let ended=false;
  function stop(){ended=true;if(timer)clearTimeout(timer);worker?.terminate();}
  try{worker=new Worker(new URL('../lib/developer-tools/developer-tools.worker.ts',import.meta.url));
   timer=setTimeout(()=>{if(!ended){stop();setState({flags:null,error:true});}},3000);
   worker.onmessage=({data}:MessageEvent<Response>)=>{if(ended)return;const flags=data.result?.supportedFlags;if(data.version!==1||data.requestId!==1||!Array.isArray(flags)||flags.some(f=>!['g','i','m','s','u','y','d'].includes(f))){stop();setState({flags:null,error:true});return;}stop();setState({flags,error:false});};
   const failed=()=>{if(!ended){stop();setState({flags:null,error:true});}};worker.onerror=failed;worker.onmessageerror=failed;
   worker.postMessage({version:1,requestId:1,id:'regex-tester',operation:'capabilities'} satisfies Request);
  }catch{queueMicrotask(()=>{if(!ended){stop();setState({flags:null,error:true});}});}
  return stop;
 },[attempt]);
 return {...state,retry:()=>{setState({flags:null,error:false});setAttempt(a=>a+1);}};
}
