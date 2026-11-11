import { spawnSync } from 'node:child_process';
// The shared SEO module validates any supplied origin during Next's build.
if (process.argv.includes('--production') && !process.env.SITE_URL?.trim()) {
 console.error('Production export requires a real SITE_URL. No example origin is substituted.'); process.exit(1);
}
const result = spawnSync(process.execPath,['node_modules/next/dist/bin/next','build'],{stdio:'inherit',windowsHide:true,env:{...process.env,STATIC_EXPORT:'1'}});
process.exit(result.status ?? 1);
