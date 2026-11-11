import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const locale of ['en','tr'])for(const id of ['json-diff','json-to-csharp'])test(`${locale}/${id}: run copy download clear locale mobile`,async({page,context,baseURL})=>{
 const issues:string[]=[];
 page.on('pageerror',e=>issues.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method())||(/^https?:/.test(r.url())&&!r.url().startsWith(baseURL!)))issues.push('network');});page.on('console',m=>{if(m.text().includes('Çağrı'))issues.push('content log');});
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:baseURL!});
 await page.goto(`/${locale}/tools/${id}`);
 await expect(page.getByRole('heading',{level:1})).toBeVisible();
 const theme=await page.locator('html').getAttribute('data-theme');await page.locator('header button.theme').click();await expect(page.locator('html')).not.toHaveAttribute('data-theme',theme!);
 await page.locator('#json-left').fill('{"name":"Çağrı 🌍","address":{"city":"İzmir"},"list":[1,null],"nil":null}');
 if(id==='json-diff')await page.locator('#json-right').fill('{"name":"Ada","address":{"city":"İzmir"},"list":[2,null],"added":false}');
 const run=page.getByRole('button',{name:id==='json-diff'?(locale==='en'?'Compare JSON':'JSON karşılaştır'):(locale==='en'?'Generate C#':'C# üret'),exact:true});
 await run.click();await expect(page.locator('#developer-output')).toHaveValue(id==='json-diff'?/"path": "\/name"/:/public class Root/);
 if(id==='json-diff'){await expect(page.locator('.diff-added')).toBeVisible();await expect(page.locator('.diff-removed')).toBeVisible();await expect(page.locator('.diff-changed').first()).toBeVisible();}
 await page.getByRole('button',{name:locale==='en'?'Copy output':'Çıktıyı kopyala',exact:true}).click();
 const output=await page.locator('#developer-output').inputValue();await expect.poll(async()=>(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n')).toBe(output);
 const pending=page.waitForEvent('download');await page.getByRole('link',{name:locale==='en'?'Download ↓':'İndir ↓'}).click();const download=await pending;expect(download.suggestedFilename()).toBe(`${id}.${id==='json-diff'?'json':'cs'}`);const file=await download.path();expect(await readFile(file!,'utf8')).toBe(output);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('Çağrı');
 await page.getByRole('button',{name:locale==='en'?'Clear':'Temizle',exact:true}).click();await expect(page.locator('#json-left')).toHaveValue('');await expect(page.getByRole('link',{name:/Download ↓|İndir ↓/})).toHaveCount(0);
 await page.locator('header .language').click();await expect(page).toHaveURL(new RegExp(`/${locale==='en'?'tr':'en'}/tools/${id}$`));await expect(page.locator('html')).toHaveAttribute('lang',locale==='en'?'tr':'en');expect(issues).toEqual([]);
});
test('Diff handles invalid sides, swap, null false zero and XSS safely',async({page})=>{
 await page.goto('/en/tools/json-diff');await page.locator('#json-left').fill('bad');await page.locator('#json-right').fill('{}');await page.getByRole('button',{name:'Compare JSON',exact:true}).click();await expect(page.locator('.workbench [role=alert]')).toContainText('Original JSON');
 await page.locator('#json-left').fill('{"x":null}');await page.locator('#json-right').fill('{"x":false}');await page.getByRole('button',{name:'Swap inputs'}).click();await expect(page.locator('#json-left')).toHaveValue('{"x":false}');await page.getByRole('button',{name:'Compare JSON',exact:true}).click();await expect(page.locator('#developer-output')).toHaveValue(/"before": false/);
 await page.locator('#json-left').fill('"<img src=x onerror=alert(1)>"');await page.locator('#json-right').fill('0');await page.getByRole('button',{name:'Compare JSON',exact:true}).click();await expect(page.locator('.diff-entry')).toContainText('<img');await expect(page.locator('.workbench img')).toHaveCount(0);
});
test('C# custom names nullable attributes fallback and invalid root',async({page})=>{
 await page.goto('/en/tools/json-to-csharp');await page.locator('#json-left').fill('[{"user-name":"Ada","empty":[],"only":null},{"user-name":null}]');await page.getByLabel('Class name',{exact:true}).fill('Person');await page.getByLabel('Namespace (optional)').fill('MyApp.Models');await page.getByRole('button',{name:'Generate C#',exact:true}).click();await expect(page.locator('#developer-output')).toHaveValue(/namespace MyApp.Models/);await expect(page.locator('#developer-output')).toHaveValue(/string\? UserName/);await expect(page.locator('.notice').filter({hasText:'Empty arrays:'})).toBeVisible();
 await page.getByLabel('Include JsonPropertyName attributes').uncheck();await page.getByLabel('Enable nullable reference types').uncheck();await page.getByRole('button',{name:'Generate C#',exact:true}).click();await expect(page.locator('#developer-output')).not.toHaveValue(/JsonPropertyName\(/);await expect(page.locator('#developer-output')).toHaveValue(/#nullable disable/);
 await page.getByRole('button',{name:'Reset options'}).click();await expect(page.getByLabel('Class name',{exact:true})).toHaveValue('Root');await expect(page.getByLabel('Enable nullable reference types')).toBeChecked();
 await page.locator('#json-left').fill('[]');await page.getByRole('button',{name:'Generate C#',exact:true}).click();await expect(page.locator('.workbench [role=alert]')).toContainText('nonempty array');
});
test('developer worker deadline can be cancelled without stale output',async({page})=>{
 await page.addInitScript(()=>{window.Worker=class {postMessage(){}terminate(){}onmessage=null;onerror=null;onmessageerror=null;} as unknown as typeof Worker;});
 await page.goto('/en/tools/json-diff');await page.locator('#json-left').fill('{}');await page.locator('#json-right').fill('{}');await page.getByRole('button',{name:'Compare JSON',exact:true}).click();await expect(page.locator('.workbench [role=alert]')).toContainText('5-second',{timeout:8000});await page.getByRole('button',{name:'Compare JSON',exact:true}).click();await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(page.locator('.workbench [role=alert]')).toHaveCount(0);await expect(page.getByRole('button',{name:'Compare JSON',exact:true})).toBeEnabled();
});
