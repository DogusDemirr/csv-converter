import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
// The shared SEO module validates any supplied origin during Next's build.
if(process.argv.includes('--production') && process.env.DEPLOYMENT_ENV==='preview') {
 console.error('Production export cannot use DEPLOYMENT_ENV=preview. Review deployment settings first.');process.exit(1);
}
if (process.argv.includes('--production') && !process.env.SITE_URL?.trim()) {
 console.error('Production export requires a real SITE_URL. No example origin is substituted.'); process.exit(1);
}
const result = spawnSync(process.execPath,['node_modules/next/dist/bin/next','build'],{stdio:'inherit',windowsHide:true,env:{...process.env,STATIC_EXPORT:'1',...(process.argv.includes('--production')?{DEPLOYMENT_ENV:'production'}:{})}});
if(result.status===0 && (process.env.DEPLOYMENT_ENV==='preview'||!process.env.SITE_URL?.trim())) appendFileSync('out/_headers','  X-Robots-Tag: noindex, nofollow\n');
process.exit(result.status ?? 1);
