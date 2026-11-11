import { spawnSync } from 'node:child_process';
import { pagesEnvironment } from './pages-environment.mjs';
const env=pagesEnvironment(process.env);
const result=spawnSync(process.execPath,['scripts/build-static.mjs',...(env.DEPLOYMENT_ENV==='production'?['--production']:[])],{env,stdio:'inherit',windowsHide:true});
process.exit(result.status??1);
