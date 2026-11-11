import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3400'], { windowsHide:true, stdio:'ignore' });
let browser;
try {
 for (let i=0;i<60;i++) { try { if ((await fetch('http://127.0.0.1:3400/en')).ok) break; } catch {} await new Promise(r=>setTimeout(r,500)); }
 const chunks=[];
 for (const name of await readdir('.next/static/chunks')) if(name.endsWith('.js')) { const bytes=await readFile(`.next/static/chunks/${name}`); const source=bytes.toString(); chunks.push({name,bytes:bytes.length,gzip:gzipSync(bytes).length,sql:source.includes('Invalid query argument. Expected string'),excel:source.includes('SharedStrings') && source.includes('Content_Types')}); }
 browser=await chromium.launch({headless:true}); const context=await browser.newContext(); const page=await context.newPage();
 const requested=new Set();context.on('request',request=>{if(request.url().includes('/_next/static/')&&request.url().endsWith('.js'))requested.add(new URL(request.url()).pathname.split('/').pop());});
 const snapshots=[];
 function snapshot(name) { const selected=chunks.filter(chunk=>requested.has(chunk.name)); const item={name,chunks:selected.length,decodedBytes:selected.reduce((n,c)=>n+c.bytes,0),gzipEstimate:selected.reduce((n,c)=>n+c.gzip,0),sql:selected.some(c=>c.sql),excel:selected.some(c=>c.excel)}; snapshots.push(item);return item; }
 await page.goto('http://127.0.0.1:3400/en/tools/json-to-typescript'); await page.locator('#json-left').fill('{"id":1}');
 const initial=snapshot('TypeScript page before run'); assert.equal(initial.sql,false);assert.equal(initial.excel,false);
 await page.getByRole('button',{name:'Generate TypeScript',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#developer-output')?.value.includes('id: number'),null,{timeout:15000});
 const generated=snapshot('After TypeScript worker run');assert.equal(generated.sql,false);assert.equal(generated.excel,false);
 await page.goto('http://127.0.0.1:3400/en/tools/sql-formatter');await page.locator('#json-left').fill('select [Id] from [Users]');await page.getByRole('button',{name:'Format SQL',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#developer-output')?.value.includes('SELECT'));
 const sql=snapshot('After SQL worker run');assert.equal(sql.sql,true);assert.equal(sql.excel,false);
 await page.goto('http://127.0.0.1:3400/en/tools/csv-to-excel');await page.locator('input[type=file]').setInputFiles({name:'sample.csv',mimeType:'text/csv',buffer:Buffer.from('name,id\nAda,001')});await page.locator('table').waitFor();assert.equal(snapshot('After CSV preview').excel,false);
 await page.getByRole('button',{name:'Convert to Excel'}).click();await page.getByRole('link',{name:'Download Excel'}).waitFor();assert.equal(snapshot('After Excel export').excel,true);
 const report={note:'Cumulative cold-context requests; gzip estimates are local compression, not measured transfer. Content markers identify vendor chunks, not a source-map module breakdown.',snapshots,totalChunks:chunks.length,totalDecodedBytes:chunks.reduce((n,c)=>n+c.bytes,0),largestChunks:chunks.sort((a,b)=>b.bytes-a.bytes).slice(0,10)};
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/bundle-summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally { await browser?.close();server.kill(); }
