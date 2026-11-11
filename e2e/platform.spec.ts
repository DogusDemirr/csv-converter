import { test, expect, type Page } from '@playwright/test';
import { readSheet } from 'read-excel-file/node';
import { unzipSync, strFromU8 } from 'fflate';
import { readFile } from 'node:fs/promises';
import { tools } from '../src/lib/tools';
const privacyEvidence = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
 const issues: string[] = []; privacyEvidence.set(page, issues);
 page.on('request', r => { if (!['GET','HEAD'].includes(r.method())) issues.push(`Unexpected ${r.method()} request`); if (/^https?:/.test(r.url()) && !r.url().startsWith('http://127.0.0.1:3100/')) issues.push('External network request'); });
 page.on('console', message => { if (/Çağrı|İstanbul|signatureVerified|alg.*none/.test(message.text())) issues.push('Input appeared in browser console'); });
 page.on('pageerror', error => issues.push(error.message));
});
test.afterEach(async ({ page }) => { expect(privacyEvidence.get(page)).toEqual([]); });
async function downloadText(page: Page) {
 const pending = page.waitForEvent('download'); await page.getByRole('link', { name: /^Download/ }).click();
 const download = await pending; const path = await download.path(); expect(path).toBeTruthy(); return readFile(path!, 'utf8');
}
test('home search, categories, locale, theme persistence and mobile overflow', async ({ page }) => {
 await page.goto('/en'); await expect(page.getByRole('heading', { level: 1 })).toContainText('Your everyday tasks');
 await page.getByRole('searchbox').fill('jwt'); await expect(page.locator('#all-tools .tool-card')).toHaveCount(1);
 await page.getByRole('searchbox').fill(''); await page.getByRole('button', {name:'Calculators',exact:true}).click(); await expect(page.getByText('No tools found')).toBeVisible();
 await page.getByRole('button', {name:'Reset filters'}).click(); await expect(page.locator('#all-tools .tool-card')).toHaveCount(12);
 await page.getByRole('button', {name:'Text Tools',exact:true}).click(); await expect(page.locator('#all-tools .tool-card')).toHaveCount(1);
 await page.getByRole('button', {name:'Toggle theme'}).click(); const theme = await page.locator('html').getAttribute('data-theme'); await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme',theme!);
 await page.locator('header').getByRole('link',{name:'TR ↗'}).click(); await expect(page).toHaveURL(/\/tr$/); await expect(page.locator('html')).toHaveAttribute('lang','tr');
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
const textCases = [
 { id:'json-formatter', input:'{"name":"Çağrı 🌍","nested":{"a":null}}', expected:'Çağrı 🌍', invalid:'{bad}' },
 { id:'json-minifier', input:' { "name": "İstanbul", "nested": [null, {"x":1}] } ', expected:'{"name":"İstanbul","nested":[null,{"x":1}]}', invalid:'{' },
 { id:'json-to-csv', input:'[{"name":"Çağrı","value":"=1+1"}]', expected:"'=1+1", invalid:'[null]' },
 { id:'csv-to-json', input:'\uFEFFname;value\nÇağrı;001', expected:'001', invalid:'a,a\nx,y' },
 { id:'base64', input:'Çağrı 🌍', expected:Buffer.from('Çağrı 🌍').toString('base64'), invalid:'' },
 { id:'jwt-decoder', input:`${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from('{"name":"Çağrı 🌍","x":null}').toString('base64url')}.`, expected:'"signatureVerified": false', invalid:'bad.token' },
];
for (const c of textCases) test(`${c.id}: worker, copy, download, reset and error`, async ({page, context, baseURL}) => {
 const leaks: string[] = []; const runtime: string[] = [];
 page.on('request', r => { if (!['GET','HEAD'].includes(r.method()) || (r.postData() ?? '').includes('Çağrı')) leaks.push(r.url()); }); page.on('pageerror',e=>runtime.push(e.message));
 await context.grantPermissions(['clipboard-read','clipboard-write'], { origin:baseURL! });
 await page.goto(`/en/tools/${c.id}`); await page.locator('#tool-input').fill(c.input); await page.getByRole('button',{name:'Run tool'}).click();
 await expect.poll(async () => (await page.locator('#tool-output').inputValue()).includes(c.expected)).toBe(true);
 const output = await page.locator('#tool-output').inputValue();
 await page.getByRole('button',{name:'Copy output'}).click(); await expect.poll(async () => (await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(output.replace(/\r\n/g, '\n'));
 expect(await downloadText(page)).toContain(c.expected);
 await page.getByRole('button',{name:'Clear / Reset'}).click(); await expect(page.locator('#tool-input')).toHaveValue(''); await expect(page.locator('#tool-output')).toHaveValue('');
 await page.locator('#tool-input').fill(c.invalid); await page.getByRole('button',{name:'Run tool'}).click(); await expect(page.locator('.workbench [role=alert]')).toBeVisible();
 expect(leaks).toEqual([]); expect(runtime).toEqual([]);
});
test('Base64 decode, XSS is inert, Turkish language keeps the tool',async({page})=>{
 await page.goto('/en/tools/base64'); await page.getByLabel('Operation').selectOption('decode');
 const source = 'İstanbul 🌍 <img src=x onerror=alert(1)>';
 await page.locator('#tool-input').fill(Buffer.from(source).toString('base64')); await page.getByRole('button',{name:'Run tool'}).click(); await expect(page.locator('#tool-output')).toHaveValue(source); await expect(page.locator('.workbench img')).toHaveCount(0);
 await page.locator('header').getByRole('link',{name:'TR ↗'}).click(); await expect(page).toHaveURL(/\/tr\/tools\/base64$/); await expect(page.getByRole('heading',{level:1})).toContainText('Base64');
});
test('CSV to Excel upload, preview, safe binary download and clear',async({page})=>{
 await page.goto('/en/tools/csv-to-excel'); await page.locator('input[type=file]').setInputFiles({name:'Türkçe.csv',mimeType:'text/csv',buffer:Buffer.from('\uFEFFname,value\nÇağrı,=1+1\nİstanbul,001')});
 await expect(page.locator('table')).toContainText('Çağrı'); await page.getByRole('button',{name:'Convert to Excel'}).click();
 const pending = page.waitForEvent('download'); await page.getByRole('link',{name:'Download Excel'}).click(); const d = await pending; const path = await d.path(); const bytes = await readFile(path!); const sheet = await readSheet(bytes); const xml = strFromU8(unzipSync(bytes)['xl/worksheets/sheet1.xml']);
 expect(sheet[1][0]).toBe('Çağrı'); expect(sheet[1][1]).toBe('=1+1'); expect(xml).not.toMatch(/<f(?:\s|>)/);
 await page.getByRole('button',{name:'Clear file'}).click(); await expect(page.locator('table')).toHaveCount(0);
});
test('empty, oversized and invalid encoding file errors',async({page})=>{
 await page.goto('/en/tools/csv-to-json');
 for (const [buffer, message] of [[Buffer.alloc(0),'nonempty'],[Buffer.alloc(5*1024*1024+1,65),'5 MB'],[Buffer.from([0xff]),'UTF-8']] as const) {
  await page.locator('input[type=file]').setInputFiles({name:'data.csv',mimeType:'text/csv',buffer}); await page.getByRole('button',{name:'Run tool'}).click(); await expect(page.locator('.workbench [role=alert]')).toContainText(message);
 }
});
for (const locale of ['en','tr']) for (const id of ['excel-to-csv','excel-to-json']) test(`${locale}/${id}: disabled without upload or worker`,async({page})=>{
 let workers = 0; page.on('worker',()=>workers++);
 await page.goto(`/${locale}/tools/${id}`);
 await expect(page.locator('main [role=status]')).toContainText(locale==='en'?'temporarily unavailable':'geçici olarak kapalı');
 await expect(page.locator('input[type=file]')).toHaveCount(0); await expect(page.getByRole('button',{name:/Run tool|Aracı çalıştır/})).toHaveCount(0);
 await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex, follow'); expect(workers).toBe(0);
 await page.goto(`/${locale}`); await expect(page.locator(`.tool-card[href$="/${id}"]`)).toHaveCount(0);
});
test('large conversion stays cancellable and reset discards result',async({page})=>{
 await page.goto('/en/tools/json-formatter'); await page.locator('#tool-input').fill(JSON.stringify(Array.from({length:50000},(_,i)=>({i,name:'İstanbul'})))); await page.getByRole('button',{name:'Run tool'}).click(); await page.getByRole('button',{name:'Clear / Reset'}).click(); await expect(page.locator('#tool-output')).toHaveValue(''); await expect(page.getByRole('button',{name:'Run tool'})).toBeEnabled();
});
test('all pages SEO, semantic headings, links, no placeholder origin, sitemap and 404',async({page,request})=>{
 const titles = new Set<string>(); const descriptions = new Set<string>(); const links = new Set<string>();
 for(const locale of ['en','tr']) for(const path of ['',...tools.map(t=>`/tools/${t.id}`)]) {
  const response = await page.goto(`/${locale}${path}`); expect(response?.status()).toBe(200); await expect(page.locator('html')).toHaveAttribute('lang',locale);
  await expect(page.locator('h1:visible')).toHaveCount(1); await expect(page.locator('meta[name=description]')).toHaveAttribute('content',/.{30,}/); await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content',/.+/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const levels = await page.locator('h1:visible,h2:visible,h3:visible,h4:visible').evaluateAll(elements => elements.map(e=>Number(e.tagName.slice(1))));
  for(let i=1;i<levels.length;i++) expect(levels[i]-levels[i-1]).toBeLessThanOrEqual(1);
  const title = await page.title(); expect(titles.has(title)).toBe(false); titles.add(title); const description = await page.locator('meta[name=description]').getAttribute('content'); expect(descriptions.has(description!)).toBe(false); descriptions.add(description!);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex, nofollow'); await expect(page.locator('link[rel=canonical]')).toHaveCount(0);
  expect(await page.content()).not.toContain('csvconverter.example');
  for(const href of await page.locator('a[href^="/"]').evaluateAll(els=>els.map(e=>e.getAttribute('href')!))) links.add(href.split('#')[0]);
 }
 for(const link of links) expect((await request.get(link)).status(),link).toBe(200);
 expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /'); expect(await (await request.get('/sitemap.xml')).text()).not.toContain('<loc>');
 expect((await request.get('/en/tools/not-a-tool')).status()).toBe(404); expect((await request.get('/de')).status()).toBe(404);
});
