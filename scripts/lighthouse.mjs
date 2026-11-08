import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3200'], { windowsHide: true, stdio: 'ignore' });
let browser;
try {
 let ready = false;
 for (let i = 0; i < 60; i++) { try { ready = (await fetch('http://127.0.0.1:3200/en')).ok; } catch {} if (ready) break; await new Promise(r => setTimeout(r, 500)); }
 if (!ready) throw new Error('Production server did not start on port 3200.');
 browser = await chromium.launch({ headless: true, args: ['--remote-debugging-port=9224'] });
 await mkdir('artifacts', { recursive: true });
 const summaries = [];
 for (const [name, path] of [['home','/en'],['json-formatter','/en/tools/json-formatter']]) {
  const result = await lighthouse(`http://127.0.0.1:3200${path}`, { port: 9224, output: ['json','html'], logLevel: 'error', onlyCategories: ['performance','accessibility','best-practices','seo'] });
  if (!result) throw new Error('Lighthouse returned no result.');
  await writeFile(`artifacts/lighthouse-${name}.json`, result.report[0]); await writeFile(`artifacts/lighthouse-${name}.html`, result.report[1]);
  const summary = { page: path, scores: Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, value.score])), metrics: Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift'].map(key=>[key,result.lhr.audits[key].displayValue])), failures: Object.entries(result.lhr.audits).filter(([,v])=>v.score!==null && v.score<1).map(([id,v])=>({id,title:v.title,details:v.details?.items})) };
  summaries.push(summary); console.log(JSON.stringify({page:summary.page,scores:summary.scores,metrics:summary.metrics}));
 }
 await writeFile('artifacts/lighthouse-summary.json',JSON.stringify(summaries,null,2));
} finally { await browser?.close(); server.kill(); }
